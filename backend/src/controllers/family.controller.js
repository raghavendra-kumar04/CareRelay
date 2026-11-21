const crypto = require('crypto');
const Family = require('../models/Family');
const Membership = require('../models/Membership');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Base family fields safe for any member. Invite fields are added separately.
function toFamilyDto(family) {
  return {
    _id: family._id,
    name: family.name,
    createdBy: family.createdBy,
    createdAt: family.createdAt,
    updatedAt: family.updatedAt,
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
    inviteToken: null,
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
    'familyId',
    'name createdBy createdAt updatedAt'
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

module.exports = {
  createFamily,
  getMyFamilies,
  getFamily,
  getMembers,
  regenerateInvite,
  joinByToken,
  removeMember,
};
