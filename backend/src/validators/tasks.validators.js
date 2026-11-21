const { z } = require('zod');

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const TASK_STATUSES = ['pending', 'in-progress', 'completed'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_CATEGORIES = [
  'appointment',
  'medication',
  'document',
  'transport',
  'communication',
  'other',
];

const objectId = z.string().regex(OBJECT_ID_PATTERN, 'must be a valid id');

// ISO datetime string or null -> Date or null. Absent (undefined) stays undefined.
const nullableDueDate = z
  .iso
  .datetime({ message: 'dueDate must be an ISO datetime' })
  .nullable()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Date(value);
  });

const taskParams = {
  params: z.object({
    fid: objectId,
    id: objectId,
  }),
};

const familyParams = {
  params: z.object({
    fid: objectId,
  }),
};

const listTasksQuery = {
  query: z.object({
    status: z.enum(TASK_STATUSES).optional(),
    assignedTo: objectId.optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    category: z.enum(TASK_CATEGORIES).optional(),
    overdue: z
      .enum(['true'])
      .optional()
      .transform((value) => (value === 'true' ? true : undefined)),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

const createTaskSchema = {
  body: z.object({
    title: z.string().trim().min(1, 'title is required').max(200),
    description: z.string().trim().max(1000).optional().default(''),
    category: z.enum(TASK_CATEGORIES),
    priority: z.enum(TASK_PRIORITIES).optional().default('medium'),
    assignedTo: objectId,
    dueDate: nullableDueDate,
  }),
};

const updateTaskSchema = {
  body: z
    .object({
      title: z.string().trim().min(1, 'title is required').max(200).optional(),
      description: z.string().trim().max(1000).optional(),
      category: z.enum(TASK_CATEGORIES).optional(),
      priority: z.enum(TASK_PRIORITIES).optional(),
      dueDate: nullableDueDate,
      assignedTo: objectId.optional(),
      status: z.enum(TASK_STATUSES).optional(),
      completionNote: z.string().trim().max(500).optional(),
    })
    .refine((obj) => Object.values(obj).some((value) => value !== undefined), {
      message: 'At least one field is required',
    }),
};

const addNoteSchema = {
  body: z.object({
    text: z.string().trim().min(1, 'text is required').max(1000),
  }),
};

module.exports = {
  taskParams,
  familyParams,
  listTasksQuery,
  createTaskSchema,
  updateTaskSchema,
  addNoteSchema,
};
