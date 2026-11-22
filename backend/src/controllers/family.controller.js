const crypto = require('crypto');
const mongoose = require('mongoose');
const Family = require('../models/Family');
const Membership = require('../models/Membership');
const CareTask = require('../models/CareTask');
const Appointment = require('../models/Appointment');
const Activity = require('../models/Activity');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Base family fields safe for any member. Invite fields are added separately.
function toFamilyDto(family) {
  const defaultRecipient = {
    _id: String(family._id ? `${family._id}-patient-1` : 'patient-1'),
    name: family.careRecipient?.name || 'Venkateswara Rao',
    relationship: family.careRecipient?.relationship || 'Father',
    age: family.careRecipient?.age || 72,
    gender: family.careRecipient?.gender || 'Male',
    condition: family.careRecipient?.condition || 'Cardiology recovery, Type 2 Diabetes, Hypertension',
    location: family.careRecipient?.location || 'Guntur, Andhra Pradesh',
    primaryLanguage: family.careRecipient?.primaryLanguage || 'Telugu, English',
    notes: family.careRecipient?.notes || '',
    isPrimary: true,
  };

  const rawPatients = Array.isArray(family.patients) && family.patients.length > 0
    ? family.patients
    : [defaultRecipient];

  const patients = rawPatients.map((p, idx) => ({
    _id: p._id ? String(p._id) : String(family._id ? `${family._id}-patient-${idx + 1}` : `patient-${idx + 1}`),
    name: p.name || 'Patient',
    relationship: p.relationship || 'Parent',
    age: p.age || 70,
    gender: p.gender || 'Other',
    condition: p.condition || '',
    location: p.location || 'Guntur, Andhra Pradesh',
    primaryLanguage: p.primaryLanguage || 'Telugu, English',
    notes: p.notes || '',
    isPrimary: Boolean(p.isPrimary),
  }));

  const primaryPatient = patients.find((p) => p.isPrimary) || patients[0] || defaultRecipient;

  return {
    _id: family._id,
    name: family.name,
    createdBy: family.createdBy,
    createdAt: family.createdAt,
    updatedAt: family.updatedAt,
    patients,
    careRecipient: family.careRecipient || primaryPatient,
  };
}

// Invite token and expiry are only exposed to admins.
function toFamilyDtoForRole(family, role) {
  const dto = toFamilyDto(family);
  if (role === 'admin') {
    dto.inviteToken = family.inviteToken;
    dto.inviteTokenExpiresAt = family.inviteTokenExpiresAt;
  }
  return dto;
}

function toMemberDto(membership) {
  const user = membership.userId;
  return {
    membershipId: membership._id,
    role: membership.role,
    joinedAt: membership.joinedAt,
    user: user
      ? { _id: user._id, name: user.name, email: user.email, avatarColor: user.avatarColor }
      : null,
  };
}

async function listMembers(familyId) {
  const memberships = await Membership.find({ familyId, deletedAt: null })
    .populate('userId', 'name email avatarColor')
    .sort({ joinedAt: 1 });
  return memberships.map(toMemberDto);
}

const createFamily = asyncHandler(async (req, res) => {
  const family = await Family.create({
    name: req.body.name,
    createdBy: req.user._id,
  });

  try {
    await Membership.create({
      familyId: family._id,
      userId: req.user._id,
      role: 'admin',
      joinedAt: new Date(),
    });
  } catch (err) {
    // Keep Family and Membership creation all-or-nothing.
    await Family.deleteOne({ _id: family._id });
    throw err;
  }

  return res.status(201).json({
    success: true,
    data: { family: toFamilyDto(family), role: 'admin' },
  });
});

const getMyFamilies = asyncHandler(async (req, res) => {
  const memberships = await Membership.find({ userId: req.user._id, deletedAt: null }).populate(
    'familyId'
  );

  const families = memberships
    .filter((m) => m.familyId)
    .map((m) => ({
      family: toFamilyDto(m.familyId),
      role: m.role,
      joinedAt: m.joinedAt,
    }));

  return res.status(200).json({
    success: true,
    data: { families },
  });
});

const getFamily = asyncHandler(async (req, res) => {
  const { fid } = req.params;

  const family = await Family.findOne({ _id: fid });
  if (!family) {
    throw new AppError(404, 'FAMILY_NOT_FOUND', 'Family not found');
  }

  const role = req.membership.role;
  const members = await listMembers(fid);

  return res.status(200).json({
    success: true,
    data: { family: toFamilyDtoForRole(family, role), role, members },
  });
});

const getMembers = asyncHandler(async (req, res) => {
  const members = await listMembers(req.params.fid);

  return res.status(200).json({
    success: true,
    data: { members },
  });
});

const regenerateInvite = asyncHandler(async (req, res) => {
  const { fid } = req.params;
  const inviteToken = crypto.randomUUID();
  const inviteTokenExpiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const family = await Family.findOneAndUpdate(
    { _id: fid },
    { $set: { inviteToken, inviteTokenExpiresAt } },
    { new: true }
  );
  if (!family) {
    throw new AppError(404, 'FAMILY_NOT_FOUND', 'Family not found');
  }

  return res.status(200).json({
    success: true,
    data: { inviteToken, inviteTokenExpiresAt },
  });
});

const joinByToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const family = await Family.findOne({ inviteToken: token });
  if (!family) {
    throw new AppError(404, 'INVITE_INVALID', 'This invite link is invalid');
  }

  const now = new Date();
  if (!family.inviteTokenExpiresAt || family.inviteTokenExpiresAt <= now) {
    throw new AppError(410, 'INVITE_EXPIRED', 'This invite link has expired');
  }

  const familyId = family._id;
  const userId = req.user._id;
  const existing = await Membership.findOne({ familyId, userId });

  if (existing && !existing.deletedAt) {
    throw new AppError(409, 'ALREADY_MEMBER', 'You are already a member of this family');
  }

  if (existing) {
    // Reactivate a soft-deleted membership without creating a duplicate record.
    const reactivated = await Membership.findOneAndUpdate(
      { _id: existing._id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, role: 'member', joinedAt: new Date() } },
      { new: true }
    );
    if (!reactivated) {
      throw new AppError(409, 'ALREADY_MEMBER', 'You are already a member of this family');
    }
  } else {
    try {
      await Membership.create({
        familyId,
        userId,
        role: 'member',
        joinedAt: new Date(),
      });
    } catch (err) {
      if (err && err.code === 11000) {
        throw new AppError(409, 'ALREADY_MEMBER', 'You are already a member of this family');
      }
      throw err;
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      family: {
        _id: family._id,
        name: family.name,
        createdAt: family.createdAt,
        updatedAt: family.updatedAt,
      },
      role: 'member',
    },
  });
});

const removeMember = asyncHandler(async (req, res) => {
  const { fid, userId } = req.params;

  if (userId === String(req.user._id)) {
    throw new AppError(400, 'INVALID_MEMBERSHIP_REMOVAL', 'You cannot remove yourself from the family');
  }

  const target = await Membership.findOne({ familyId: fid, userId, deletedAt: null });
  if (!target) {
    throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', 'Member not found in this family');
  }

  if (target.role === 'admin') {
    const adminCount = await Membership.countDocuments({
      familyId: fid,
      role: 'admin',
      deletedAt: null,
    });
    if (adminCount <= 1) {
      throw new AppError(409, 'LAST_ADMIN', 'A family must keep at least one admin');
    }
  }

  // Soft delete only; the document is kept so the member can rejoin later.
  target.deletedAt = new Date();
  await target.save();

  return res.status(200).json({
    success: true,
    data: { userId, removed: true },
  });
});

// Snapshot DTO helpers: explicit field whitelists, never raw documents.
function toUserRefDto(user) {
  return user ? { _id: String(user._id), name: user.name, avatarColor: user.avatarColor } : null;
}

function toSnapshotAppointmentDto(appt) {
  return {
    _id: String(appt._id),
    title: appt.title,
    doctorName: appt.doctorName,
    clinic: appt.clinic,
    specialty: appt.specialty,
    dateTime: appt.dateTime,
    location: appt.location,
    status: appt.status,
    notes: appt.notes,
    assignedTo: toUserRefDto(appt.assignedTo),
  };
}

function toSnapshotTaskDto(task) {
  return {
    _id: String(task._id),
    title: task.title,
    priority: task.priority,
    status: task.status,
    category: task.category,
    dueDate: task.dueDate,
    assignedTo: toUserRefDto(task.assignedTo),
  };
}

function toSnapshotActivityDto(activity) {
  return {
    _id: String(activity._id),
    actorId: String(activity.actorId),
    actorName: activity.actorName,
    entityType: activity.entityType,
    entityId: String(activity.entityId),
    entityTitle: activity.entityTitle,
    action: activity.action,
    meta: activity.meta,
    createdAt: activity.createdAt,
  };
}

const getSnapshot = asyncHandler(async (req, res) => {
  const familyId = req.params.fid;
  const { patientId } = req.query;
  const now = new Date();
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const family = await Family.findById(familyId).lean();
  const primaryPatientId = family?.patients?.[0]?._id ? String(family.patients[0]._id) : null;
  const isPrimary = patientId && primaryPatientId && String(patientId) === primaryPatientId;

  const taskFilter = { familyId, deletedAt: null };
  const apptFilter = {
    familyId,
    deletedAt: null,
    status: 'scheduled',
    dateTime: { $gte: now, $lte: sevenDaysAhead },
  };

  if (patientId && patientId !== 'all') {
    const isObjectId = mongoose.Types.ObjectId.isValid(patientId);
    const pId = isObjectId ? new mongoose.Types.ObjectId(patientId) : patientId;
    if (isPrimary) {
      taskFilter.$or = [{ patientId: pId }, { patientId: null }, { patientId: { $exists: false } }];
      apptFilter.$or = [{ patientId: pId }, { patientId: null }, { patientId: { $exists: false } }];
    } else {
      taskFilter.patientId = pId;
      apptFilter.patientId = pId;
    }
  }

  const [
    completedCount,
    pendingCount,
    overdueCount,
    upcomingAppointments,
    overdueTasks,
    recentActivities,
  ] = await Promise.all([
    CareTask.countDocuments({ ...taskFilter, status: 'completed' }),
    CareTask.countDocuments({ ...taskFilter, status: { $in: ['pending', 'in-progress'] } }),
    CareTask.countDocuments({
      ...taskFilter,
      status: { $ne: 'completed' },
      dueDate: { $lt: now },
    }),
    Appointment.find(apptFilter)
      .sort({ dateTime: 1 })
      .limit(20)
      .populate('assignedTo', 'name avatarColor')
      .lean(),
    CareTask.find({
      ...taskFilter,
      status: { $ne: 'completed' },
      dueDate: { $lt: now },
    })
      .sort({ dueDate: 1 })
      .limit(20)
      .populate('assignedTo', 'name avatarColor')
      .lean(),
    Activity.find({ familyId }).sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      snapshot: {
        counts: { completed: completedCount, pending: pendingCount, overdue: overdueCount },
        upcomingAppointments: upcomingAppointments.map(toSnapshotAppointmentDto),
        overdueTasks: overdueTasks.map(toSnapshotTaskDto),
        recentActivities: recentActivities.map(toSnapshotActivityDto),
        generatedAt: now,
      },
    },
  });
});

const updateCareRecipient = asyncHandler(async (req, res) => {
  const { fid } = req.params;
  const family = await Family.findById(fid);
  if (!family) throw new AppError(404, 'FAMILY_NOT_FOUND', 'Family workspace not found');

  const { name, age, condition, location, primaryLanguage, notes } = req.body;
  if (!family.careRecipient) {
    family.careRecipient = {
      name: 'Venkateswara Rao',
      age: 72,
      condition: 'Cardiology recovery, Type 2 Diabetes, Hypertension',
      location: 'Guntur, Andhra Pradesh',
      primaryLanguage: 'Telugu, English',
      notes: '',
    };
  }

  if (name !== undefined) family.careRecipient.name = name.trim();
  if (age !== undefined && !Number.isNaN(Number(age))) family.careRecipient.age = Number(age);
  if (condition !== undefined) family.careRecipient.condition = condition.trim();
  if (location !== undefined) family.careRecipient.location = location.trim();
  if (primaryLanguage !== undefined) family.careRecipient.primaryLanguage = primaryLanguage.trim();
  if (notes !== undefined) family.careRecipient.notes = notes.trim();

  await family.save();

  return res.status(200).json({
    success: true,
    data: { family: toFamilyDtoForRole(family, req.membership?.role) },
  });
});

const addPatient = asyncHandler(async (req, res) => {
  const { fid } = req.params;
  const family = await Family.findById(fid);
  if (!family) throw new AppError(404, 'FAMILY_NOT_FOUND', 'Family workspace not found');

  if (!Array.isArray(family.patients) || family.patients.length === 0) {
    const existingRecipient = family.careRecipient || {};
    family.patients = [
      {
        name: existingRecipient.name || 'Venkateswara Rao',
        relationship: existingRecipient.relationship || 'Father',
        age: existingRecipient.age || 72,
        gender: existingRecipient.gender || 'Male',
        condition: existingRecipient.condition || 'Cardiology recovery, Type 2 Diabetes, Hypertension',
        location: existingRecipient.location || 'Guntur, Andhra Pradesh',
        primaryLanguage: existingRecipient.primaryLanguage || 'Telugu, English',
        notes: existingRecipient.notes || '',
        isPrimary: true,
      },
    ];
  }

  const { name, relationship, age, gender, condition, location, primaryLanguage, notes } = req.body;

  const newPatient = {
    name: name.trim(),
    relationship: (relationship || 'Parent').trim(),
    age: age !== undefined && !Number.isNaN(Number(age)) ? Number(age) : 70,
    gender: gender || 'Other',
    condition: (condition || '').trim(),
    location: (location || 'Guntur, Andhra Pradesh').trim(),
    primaryLanguage: (primaryLanguage || 'Telugu, English').trim(),
    notes: (notes || '').trim(),
    isPrimary: false,
  };

  family.patients.push(newPatient);

  await family.save();

  const savedPatient = family.patients[family.patients.length - 1];

  return res.status(201).json({
    success: true,
    data: {
      patient: savedPatient,
      family: toFamilyDtoForRole(family, req.membership?.role),
    },
  });
});

const updatePatient = asyncHandler(async (req, res) => {
  const { fid, patientId } = req.params;
  const family = await Family.findById(fid);
  if (!family) throw new AppError(404, 'FAMILY_NOT_FOUND', 'Family workspace not found');

  if (!Array.isArray(family.patients)) {
    family.patients = [];
  }

  const patient = family.patients.id(patientId);
  if (!patient) throw new AppError(404, 'PATIENT_NOT_FOUND', 'Care recipient not found in this family');

  const { name, relationship, age, gender, condition, location, primaryLanguage, notes, isPrimary } = req.body;

  if (name !== undefined) patient.name = name.trim();
  if (relationship !== undefined) patient.relationship = relationship.trim();
  if (age !== undefined && !Number.isNaN(Number(age))) patient.age = Number(age);
  if (gender !== undefined) patient.gender = gender;
  if (condition !== undefined) patient.condition = condition.trim();
  if (location !== undefined) patient.location = location.trim();
  if (primaryLanguage !== undefined) patient.primaryLanguage = primaryLanguage.trim();
  if (notes !== undefined) patient.notes = notes.trim();

  if (isPrimary === true) {
    family.patients.forEach((p) => {
      p.isPrimary = p._id.toString() === patientId.toString();
    });
    family.careRecipient = {
      name: patient.name,
      age: patient.age,
      condition: patient.condition,
      location: patient.location,
      primaryLanguage: patient.primaryLanguage,
      notes: patient.notes,
    };
  }

  await family.save();

  return res.status(200).json({
    success: true,
    data: {
      patient,
      family: toFamilyDtoForRole(family, req.membership?.role),
    },
  });
});

const deletePatient = asyncHandler(async (req, res) => {
  const { fid, patientId } = req.params;
  const family = await Family.findById(fid);
  if (!family) throw new AppError(404, 'FAMILY_NOT_FOUND', 'Family workspace not found');

  if (!Array.isArray(family.patients)) {
    throw new AppError(404, 'PATIENT_NOT_FOUND', 'Care recipient not found in this family');
  }

  const patientIndex = family.patients.findIndex((p) => p._id.toString() === patientId.toString());
  if (patientIndex === -1) {
    throw new AppError(404, 'PATIENT_NOT_FOUND', 'Care recipient not found in this family');
  }

  family.patients.splice(patientIndex, 1);
  await family.save();

  return res.status(200).json({
    success: true,
    data: {
      patientId,
      family: toFamilyDtoForRole(family, req.membership?.role),
    },
  });
});

module.exports = {
  createFamily,
  getMyFamilies,
  getFamily,
  getMembers,
  regenerateInvite,
  joinByToken,
  removeMember,
  getSnapshot,
  updateCareRecipient,
  addPatient,
  updatePatient,
  deletePatient,
};
