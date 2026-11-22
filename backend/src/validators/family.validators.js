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

const updateCareRecipientSchema = z.object({
  name: z.string().trim().min(1, 'Patient name cannot be empty').max(120).optional(),
  age: z.coerce.number().min(0, 'Age must be positive').max(150).optional(),
  condition: z.string().trim().max(300).optional(),
  location: z.string().trim().max(150).optional(),
  primaryLanguage: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const addPatientSchema = z.object({
  name: z.string().trim().min(1, 'Patient name is required').max(120),
  relationship: z.string().trim().max(80).optional(),
  age: z.coerce.number().min(0, 'Age must be positive').max(150).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  condition: z.string().trim().max(300).optional(),
  location: z.string().trim().max(150).optional(),
  primaryLanguage: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const updatePatientSchema = addPatientSchema.partial();

const patientParams = z.object({
  fid: z.string().regex(OBJECT_ID_PATTERN, 'fid must be a valid id'),
  patientId: z.string().regex(OBJECT_ID_PATTERN, 'patientId must be a valid id'),
});

module.exports = {
  createFamilySchema,
  familyIdParams,
  memberParams,
  tokenParams,
  updateCareRecipientSchema,
  addPatientSchema,
  updatePatientSchema,
  patientParams,
};
