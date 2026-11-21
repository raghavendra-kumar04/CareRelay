const mongoose = require('mongoose');
const { AppError } = require('./errorHandler');
const Membership = require('../models/Membership');

async function requireFamilyMembership(req, res, next) {
  try {
    const fid = req.params.fid;

    if (!mongoose.isValidObjectId(fid)) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid family id'));
    }

    if (!req.user) {
      return next(new AppError(401, 'TOKEN_MISSING', 'Authentication required'));
    }

    // Soft-deleted memberships (deletedAt set) are excluded by this query.
    const membership = await Membership.findOne({
      familyId: fid,
      userId: req.user._id,
      deletedAt: null,
    });

    if (!membership) {
      return next(
        new AppError(403, 'FAMILY_ACCESS_DENIED', 'You are not an active member of this family')
      );
    }

    req.membership = membership;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = requireFamilyMembership;
