const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Membership = require('../models/Membership');
const activityService = require('../services/activityService');
const socketService = require('../services/socketService');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const ASSIGNEE_FIELDS = 'name avatarColor';

function toAppointmentDto(appt) {
  const assignee = appt.assignedTo;
  const creator = appt.createdBy;
  return {
    _id: String(appt._id),
    familyId: String(appt.familyId),
    title: appt.title,
    doctorName: appt.doctorName || '',
    clinic: appt.clinic || '',
    specialty: appt.specialty || '',
    dateTime: appt.dateTime,
    location: appt.location || '',
    status: appt.status,
    notes: appt.notes || '',
    patientId: appt.patientId ? String(appt.patientId) : null,
    patientName: appt.patientName || '',
    assignedTo: assignee && typeof assignee === 'object' && assignee.name
      ? { _id: String(assignee._id), name: assignee.name, avatarColor: assignee.avatarColor }
      : null,
    createdBy: creator && typeof creator === 'object' && creator.name
      ? { _id: String(creator._id), name: creator.name, avatarColor: creator.avatarColor }
      : creator ? String(creator) : null,
    createdAt: appt.createdAt,
    updatedAt: appt.updatedAt,
  };
}

function toActivityDto(activity, apptDto = null) {
  return {
    _id: String(activity._id),
    familyId: String(activity.familyId),
    actorId: String(activity.actorId),
    actorName: activity.actorName,
    entityType: activity.entityType,
    entityId: String(activity.entityId),
    entityTitle: activity.entityTitle,
    action: activity.action,
    meta: activity.meta,
    assignedTo: apptDto?.assignedTo || null,
    assignedBy: apptDto?.createdBy || null,
    createdAt: activity.createdAt,
  };
}

const createAppointment = asyncHandler(async (req, res) => {
  const { fid } = req.params;
  const { assignedTo } = req.body;

  // Validate assignee belongs to family
  const membership = await Membership.findOne({
    familyId: fid,
    userId: assignedTo,
    deletedAt: null,
  });
  if (!membership) {
    throw new AppError(400, 'INVALID_ASSIGNEE', 'Assignee must be an active family member');
  }

  const appointment = await Appointment.create({
    ...req.body,
    patientId: req.body.patientId && mongoose.Types.ObjectId.isValid(req.body.patientId) ? new mongoose.Types.ObjectId(req.body.patientId) : null,
    patientName: req.body.patientName || '',
    familyId: fid,
    createdBy: req.user._id,
  });

  const populated = await Appointment.findById(appointment._id)
    .populate('assignedTo', ASSIGNEE_FIELDS)
    .populate('createdBy', ASSIGNEE_FIELDS);

  const dto = toAppointmentDto(populated);

  // Log activity
  let activityDoc = null;
  try {
    activityDoc = await activityService.log({
      familyId: fid,
      actorId: req.user._id,
      actorName: req.user.name,
      entityType: 'appointment',
      entityId: appointment._id,
      entityTitle: appointment.title,
      action: 'created',
      meta: {
        dateTime: appointment.dateTime,
        assignedTo: String(assignedTo),
        patientId: appointment.patientId ? String(appointment.patientId) : null,
        patientName: appointment.patientName || '',
      },
    });
  } catch (err) {
    console.error('Failed to log appointment activity:', err);
  }

  // Socket emissions
  try {
    socketService.emitToFamily(fid, 'appointment:created', { appointment: dto });
    if (activityDoc) {
      socketService.emitToFamily(fid, 'activity:new', { activity: toActivityDto(activityDoc, dto) });
    }
  } catch (err) {
    console.error('Socket emission error:', err);
  }

  return res.status(201).json({
    success: true,
    data: { appointment: dto },
  });
});

const listAppointments = asyncHandler(async (req, res) => {
  const { fid } = req.params;
  const { status, assignedTo, upcoming, patientId, page = 1, limit = 20 } = req.query;

  const filter = { familyId: fid, deletedAt: null };
  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = assignedTo;

  if (patientId && patientId !== 'all') {
    const Family = require('../models/Family');
    const family = await Family.findById(fid).lean();
    const primaryPatientId = family?.patients?.[0]?._id ? String(family.patients[0]._id) : null;
    const isPrimary = primaryPatientId && String(patientId) === primaryPatientId;
    const isObjectId = mongoose.Types.ObjectId.isValid(patientId);
    const pObjectId = isObjectId ? new mongoose.Types.ObjectId(patientId) : null;

    if (isPrimary) {
      filter.$or = [
        ...(pObjectId ? [{ patientId: pObjectId }] : []),
        { patientId: null },
        { patientId: { $exists: false } },
      ];
    } else if (pObjectId) {
      filter.patientId = pObjectId;
    } else {
      filter.patientId = patientId;
    }
  }

  let sort = { dateTime: -1 };
  if (upcoming) {
    filter.dateTime = { $gte: new Date() };
    if (!status) filter.status = 'scheduled';
    sort = { dateTime: 1 };
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('assignedTo', ASSIGNEE_FIELDS)
      .populate('createdBy', ASSIGNEE_FIELDS),
    Appointment.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      appointments: appointments.map(toAppointmentDto),
      pagination: {
        page,
        limit,
        total,
      },
    },
  });
});

const getAppointment = asyncHandler(async (req, res) => {
  const { fid, id } = req.params;

  const appt = await Appointment.findOne({ _id: id, familyId: fid, deletedAt: null })
    .populate('assignedTo', ASSIGNEE_FIELDS)
    .populate('createdBy', ASSIGNEE_FIELDS);

  if (!appt) {
    throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
  }

  return res.status(200).json({
    success: true,
    data: { appointment: toAppointmentDto(appt) },
  });
});

const updateAppointment = asyncHandler(async (req, res) => {
  const { fid, id } = req.params;

  const appt = await Appointment.findOne({ _id: id, familyId: fid, deletedAt: null });
  if (!appt) {
    throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
  }

  const isCreator = String(appt.createdBy?._id || appt.createdBy) === String(req.user._id);
  const isAdmin = req.membership && req.membership.role === 'admin';
  const isAssignee = String(appt.assignedTo?._id || appt.assignedTo) === String(req.user._id);

  // If editing details other than status, must be creator or admin
  const hasMetaFields = Object.keys(req.body).some((k) => k !== 'status');
  if (hasMetaFields && !isCreator && !isAdmin) {
    throw new AppError(403, 'FORBIDDEN', 'Only the appointment creator or an admin can edit appointment details');
  }

  // If updating status, must be assignee, creator, or admin
  if (req.body.status && !isAssignee && !isCreator && !isAdmin) {
    throw new AppError(403, 'FORBIDDEN', 'Only assigned members, the creator, or an admin can change appointment status');
  }

  if (req.body.assignedTo && String(req.body.assignedTo) !== String(appt.assignedTo)) {
    const membership = await Membership.findOne({
      familyId: fid,
      userId: req.body.assignedTo,
      deletedAt: null,
    });
    if (!membership) {
      throw new AppError(400, 'INVALID_ASSIGNEE', 'Assignee must be an active family member');
    }
  }

  const oldStatus = appt.status;
  const oldDateTime = appt.dateTime;

  Object.assign(appt, req.body);
  await appt.save();

  const populated = await Appointment.findById(appt._id)
    .populate('assignedTo', ASSIGNEE_FIELDS)
    .populate('createdBy', ASSIGNEE_FIELDS);
  const dto = toAppointmentDto(populated);

  let action = 'updated';
  if (req.body.status && req.body.status === 'completed') {
    action = 'completed';
  } else if (req.body.status && req.body.status !== oldStatus) {
    action = 'status_changed';
  } else if (req.body.assignedTo && String(req.body.assignedTo) !== String(appt.assignedTo)) {
    action = 'reassigned';
  }

  let activityDoc = null;
  try {
    activityDoc = await activityService.log({
      familyId: fid,
      actorId: req.user._id,
      actorName: req.user.name,
      entityType: 'appointment',
      entityId: appt._id,
      entityTitle: appt.title,
      action,
      meta: {
        oldStatus,
        newStatus: appt.status,
        oldDateTime,
        newDateTime: appt.dateTime,
      },
    });
  } catch (err) {
    console.error('Failed to log appointment activity:', err);
  }

  try {
    socketService.emitToFamily(fid, 'appointment:updated', { appointment: dto });
    if (activityDoc) {
      socketService.emitToFamily(fid, 'activity:new', { activity: toActivityDto(activityDoc, dto) });
    }
  } catch (err) {
    console.error('Socket emission error:', err);
  }

  return res.status(200).json({
    success: true,
    data: { appointment: dto },
  });
});

const deleteAppointment = asyncHandler(async (req, res) => {
  const { fid, id } = req.params;

  const appt = await Appointment.findOne({ _id: id, familyId: fid, deletedAt: null });
  if (!appt) {
    throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
  }

  const isCreator = String(appt.createdBy?._id || appt.createdBy) === String(req.user._id);
  const isAdmin = req.membership && req.membership.role === 'admin';
  if (!isCreator && !isAdmin) {
    throw new AppError(403, 'FORBIDDEN', 'Only the appointment creator or an admin can delete this appointment');
  }

  // Soft delete
  appt.deletedAt = new Date();
  await appt.save();

  let activityDoc = null;
  try {
    activityDoc = await activityService.log({
      familyId: fid,
      actorId: req.user._id,
      actorName: req.user.name,
      entityType: 'appointment',
      entityId: appt._id,
      entityTitle: appt.title,
      action: 'deleted',
    });
  } catch (err) {
    console.error('Failed to log appointment activity:', err);
  }

  try {
    socketService.emitToFamily(fid, 'appointment:updated', { appointment: toAppointmentDto(appt) });
    if (activityDoc) {
      socketService.emitToFamily(fid, 'activity:new', { activity: toActivityDto(activityDoc) });
    }
  } catch (err) {
    console.error('Socket emission error:', err);
  }

  return res.status(200).json({
    success: true,
    data: { message: 'Appointment deleted successfully', id },
  });
});

module.exports = {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,
};
