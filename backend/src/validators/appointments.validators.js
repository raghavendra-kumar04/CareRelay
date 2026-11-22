const { z } = require('zod');

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const objectId = z.string().regex(OBJECT_ID_PATTERN, 'must be a valid id');

const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled'];

const nullableDateTime = z
  .string()
  .datetime({ message: 'dateTime must be an ISO datetime string' })
  .transform((val) => new Date(val));

const appointmentParams = {
  params: z.object({
    fid: objectId,
    id: objectId,
  }),
};

const listAppointmentsQuery = {
  query: z.object({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    assignedTo: objectId.optional(),
    patientId: z.string().optional(),
    upcoming: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => (val === 'true' ? true : undefined)),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

const createAppointmentSchema = {
  body: z.object({
    title: z.string().trim().min(1, 'title is required').max(200),
    doctorName: z.string().trim().max(100).optional().default(''),
    clinic: z.string().trim().max(150).optional().default(''),
    specialty: z.string().trim().max(80).optional().default(''),
    dateTime: nullableDateTime,
    location: z.string().trim().max(200).optional().default(''),
    assignedTo: objectId,
    patientId: z.string().optional(),
    patientName: z.string().trim().optional(),
    status: z.enum(APPOINTMENT_STATUSES).optional().default('scheduled'),
    notes: z.string().trim().max(1000).optional().default(''),
  }),
};

const updateAppointmentSchema = {
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    doctorName: z.string().trim().max(100).optional(),
    clinic: z.string().trim().max(150).optional(),
    specialty: z.string().trim().max(80).optional(),
    dateTime: nullableDateTime.optional(),
    location: z.string().trim().max(200).optional(),
    assignedTo: objectId.optional(),
    patientId: z.string().optional(),
    patientName: z.string().trim().optional(),
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
};

module.exports = {
  appointmentParams,
  listAppointmentsQuery,
  createAppointmentSchema,
  updateAppointmentSchema,
};
