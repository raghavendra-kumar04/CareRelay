const { asyncHandler } = require('../middleware/errorHandler');
const activityService = require('../services/activityService');

function toActivityDto(activity) {
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
    createdAt: activity.createdAt,
  };
}

// GET /api/families/:fid/activities
// Membership is enforced by requireFamilyMembership before this runs.
const listActivities = asyncHandler(async (req, res) => {
  const fid = req.params.fid;
  const { entityType, actorId, startDate, endDate, page, limit } = req.validatedQuery;

  const { items, total } = await activityService.listForFamily(fid, {
    entityType,
    actorId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    page,
    limit,
  });

  return res.status(200).json({
    success: true,
    data: items.map(toActivityDto),
    pagination: { page, limit, total },
  });
});

module.exports = { listActivities };
