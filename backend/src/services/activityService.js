const Activity = require('../models/Activity');

/**
 * Append a single immutable activity record.
 * Pass options.session to write inside an existing transaction.
 */
async function log(data, options = {}) {
  const doc = {
    familyId: data.familyId,
    actorId: data.actorId,
    actorName: data.actorName,
    entityType: data.entityType,
    entityId: data.entityId,
    entityTitle: data.entityTitle,
    action: data.action,
    meta: data.meta || {},
    createdAt: new Date(),
  };

  if (options.session) {
    const [created] = await Activity.create([doc], { session: options.session });
    return created;
  }
  return Activity.create(doc);
}

/**
 * Paginated, newest-first activity feed scoped to one family.
 */
async function listForFamily(
  familyId,
  { entityType, actorId, startDate, endDate, page = 1, limit = 20 } = {}
) {
  if (!familyId) {
    throw new Error('familyId is required');
  }

  const filter = { familyId };
  if (entityType) filter.entityType = entityType;
  if (actorId) filter.actorId = actorId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  const [items, total] = await Promise.all([
    Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Activity.countDocuments(filter),
  ]);

  return { items, total };
}

module.exports = { log, listForFamily };
