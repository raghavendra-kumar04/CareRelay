const { z } = require('zod');

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

const createFamilySchema = z.object({
  name: z
    .string({ error: 'name is required' })
    .trim()
    .min(1, 'name is required')
    .max(100, 'name must be at most 100 characters'),
});

const familyIdParams = z.object({
  fid: z.string().regex(OBJECT_ID_PATTERN, 'fid must be a valid id'),
});

const memberParams = z.object({
  fid: z.string().regex(OBJECT_ID_PATTERN, 'fid must be a valid id'),
  userId: z.string().regex(OBJECT_ID_PATTERN, 'userId must be a valid id'),
});

const tokenParams = z.object({
  token: z.string().uuid('token must be a valid invite token'),
});

module.exports = { createFamilySchema, familyIdParams, memberParams, tokenParams };
