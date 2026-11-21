const { z } = require('zod');

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const ACTIVITY_ENTITY_TYPES = ['task', 'appointment'];

const objectId = z.string().regex(OBJECT_ID_PATTERN, 'must be a valid id');

const activityParams = {
  params: z.object({
    fid: objectId,
  }),
};

const listActivitiesQuery = {
  query: z
    .object({
      entityType: z.enum(ACTIVITY_ENTITY_TYPES).optional(),
      actorId: objectId.optional(),
      startDate: z.iso.datetime({ message: 'startDate must be an ISO datetime' }).optional(),
      endDate: z.iso.datetime({ message: 'endDate must be an ISO datetime' }).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .refine((q) => !q.startDate || !q.endDate || new Date(q.startDate) <= new Date(q.endDate), {
      message: 'startDate must be before endDate',
    }),
};

module.exports = {
  activityParams,
  listActivitiesQuery,
};
