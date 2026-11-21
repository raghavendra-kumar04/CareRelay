const { z } = require('zod');

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const objectId = z.string().regex(OBJECT_ID_PATTERN, 'must be a valid id');

const PRESCRIPTION_STATUSES = ['active', 'completed', 'discontinued'];

const nullableDate = z
  .string()
  .datetime({ message: 'Must be an ISO datetime string' })
  .transform((val) => new Date(val))
  .nullable()
  .optional();

const prescriptionParams = {
  params: z.object({
    fid: objectId,
    id: objectId,
  }),
};

const listPrescriptionsQuery = {
  query: z.object({
    status: z.enum(PRESCRIPTION_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

const createPrescriptionSchema = {
  body: z.object({
    medicationName: z.string().trim().min(1, 'medicationName is required').max(200),
    dosage: z.string().trim().max(100).optional().default(''),
    frequency: z.string().trim().max(200).optional().default(''),
    prescribedBy: z.string().trim().max(100).optional().default(''),
    startDate: nullableDate,
    endDate: nullableDate,
    refillDueDate: nullableDate,
    notes: z.string().trim().max(1000).optional().default(''),
    status: z.enum(PRESCRIPTION_STATUSES).optional().default('active'),
  }),
};

const updatePrescriptionSchema = {
  body: z.object({
    medicationName: z.string().trim().min(1).max(200).optional(),
    dosage: z.string().trim().max(100).optional(),
    frequency: z.string().trim().max(200).optional(),
    prescribedBy: z.string().trim().max(100).optional(),
    startDate: nullableDate,
    endDate: nullableDate,
    refillDueDate: nullableDate,
    notes: z.string().trim().max(1000).optional(),
    status: z.enum(PRESCRIPTION_STATUSES).optional(),
  }),
};

module.exports = {
  prescriptionParams,
  listPrescriptionsQuery,
  createPrescriptionSchema,
  updatePrescriptionSchema,
};
