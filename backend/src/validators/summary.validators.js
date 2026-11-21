const { z } = require('zod');

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const objectId = z.string().regex(OBJECT_ID_PATTERN, 'must be a valid id');

const familyParams = {
  params: z.object({
    fid: objectId,
  }),
};

const summaryIdParams = {
  params: z.object({
    fid: objectId,
    id: objectId,
  }),
};

const listSummariesQuery = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
};

module.exports = {
  familyParams,
  summaryIdParams,
  listSummariesQuery,
};
