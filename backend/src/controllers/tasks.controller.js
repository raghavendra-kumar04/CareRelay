const mongoose = require('mongoose');
const CareTask = require('../models/CareTask');
const Membership = require('../models/Membership');
const activityService = require('../services/activityService');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const ASSIGNEE_FIELDS = 'name avatarColor';
const COMPLETION_NOTE_MIN_LENGTH = 5;

// Allowed status moves. Same-status is handled as a no-op before this lookup.
const ALLOWED_TRANSITIONS = {
  pending: ['in-progress', 'completed'],
  'in-progress': ['pending', 'completed'],
  completed: ['in-progress'], // admin reopen
};

// Plain fields a member may change; assignedTo and status have their own rules.
const SIMPLE_FIELDS = ['title', 'description', 'category', 'priority', 'dueDate'];

function toTaskDto(task) {
  const now = new Date();
  const assignee = task.assignedTo;
  return {
    _id: task._id,
    familyId: task.familyId,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    status: task.status,
    assignedTo: assignee
      ? { _id: assignee._id, name: assignee.name, avatarColor: assignee.avatarColor }
      : null,
    createdBy: task.createdBy,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    completionNote: task.completionNote,
    notes: (task.notes || []).map((note) => ({
      _id: note._id,
      author: note.author,
      text: note.text,
      createdAt: note.createdAt,
    })),
    relatedAppointmentId: task.relatedAppointmentId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    isOverdue: task.status !== 'completed' && task.dueDate != null && task.dueDate < now,
  };
}

async function assertActiveMember(familyId, userId) {
  const member = await Membership.exists({ familyId, userId, deletedAt: null });
  if (!member) {
    throw new AppError(400, 'INVALID_ASSIGNEE', 'Assignee must be an active member of this family');
  }
}

async function loadTaskDto(taskId, familyId) {
  const task = await CareTask.findOne({ _id: taskId, familyId, deletedAt: null }).populate(
    'assignedTo',
    ASSIGNEE_FIELDS
  );
  return task ? toTaskDto(task) : null;
}

// Comparable form of a field value: Dates by time, null/undefined as null.
function normalizeValue(value) {
  if (value instanceof Date) return value.getTime();
  return value === undefined ? null : value;
}

const listTasks = asyncHandler(async (req, res) => {
  const { fid } = req.params;
  const { status, assignedTo, priority, category, overdue, page, limit } = req.validatedQuery;

  const match = {
    familyId: new mongoose.Types.ObjectId(fid),
    deletedAt: null,
  };
  if (status) match.status = status;
  if (assignedTo) match.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  if (priority) match.priority = priority;
  if (category) match.category = category;
  if (overdue) {
    if (!status) match.status = { $ne: 'completed' };
    match.dueDate = { $lt: new Date() };
  }

  // Aggregation does not cast strings, so the match above uses ObjectIds.
  const idRows = await CareTask.aggregate([
    { $match: match },
    { $addFields: { noDue: { $cond: [{ $eq: ['$dueDate', null] }, 1, 0] } } },
    { $sort: { noDue: 1, dueDate: 1, _id: 1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    { $project: { _id: 1 } },
  ]);
  const ids = idRows.map((row) => row._id);

  const loaded = await CareTask.find({
    _id: { $in: ids },
    familyId: match.familyId,
    deletedAt: null,
  }).populate('assignedTo', ASSIGNEE_FIELDS);

  const byId = new Map(loaded.map((task) => [String(task._id), task]));
  const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean);

  const total = await CareTask.countDocuments(match);

  return res.status(200).json({
    success: true,
    data: ordered.map(toTaskDto),
    pagination: { page, limit, total },
  });
});

const createTask = asyncHandler(async (req, res) => {
  const familyId = req.params.fid;
  const { title, description, category, priority, assignedTo, dueDate } = req.body;

  await assertActiveMember(familyId, assignedTo);

  let createdId = null;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const [task] = await CareTask.create(
        [
          {
            familyId,
            title,
            description,
            category,
            priority,
            assignedTo,
            createdBy: req.user._id,
            dueDate,
            status: 'pending',
          },
        ],
        { session }
      );

      await activityService.log(
        {
          familyId,
          actorId: req.user._id,
          actorName: req.user.name,
          entityType: 'task',
          entityId: task._id,
          entityTitle: task.title,
          action: 'created',
          meta: {
            priority,
            category,
            assignedTo: String(assignedTo),
            dueDate: task.dueDate,
          },
        },
        { session }
      );

      createdId = task._id;
    });
  } finally {
    await session.endSession();
  }

  const taskDto = await loadTaskDto(createdId, familyId);
  return res.status(201).json({
    success: true,
    data: { task: taskDto },
  });
});

const getTask = asyncHandler(async (req, res) => {
  const { fid, id } = req.params;

  const taskDto = await loadTaskDto(id, fid);
  if (!taskDto) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  return res.status(200).json({
    success: true,
    data: { task: taskDto },
  });
});

const updateTask = asyncHandler(async (req, res) => {
  const { fid: familyId, id } = req.params;
  const body = req.body;
  const isAdmin = req.membership.role === 'admin';

  const task = await CareTask.findOne({ _id: id, familyId, deletedAt: null });
  if (!task) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (task.status === 'completed' && !isAdmin) {
    throw new AppError(403, 'TASK_LOCKED', 'Completed tasks can only be changed by an admin');
  }

  const updates = {};
  const changedFields = [];

  for (const field of SIMPLE_FIELDS) {
    if (body[field] === undefined) continue;
    if (normalizeValue(body[field]) !== normalizeValue(task[field])) {
      updates[field] = body[field];
      changedFields.push(field);
    }
  }

  let assigneeChanged = false;
  if (body.assignedTo !== undefined && String(body.assignedTo) !== String(task.assignedTo)) {
    await assertActiveMember(familyId, body.assignedTo);
    assigneeChanged = true;
    updates.assignedTo = body.assignedTo;
  }

  let statusChanged = false;
  let completing = false;
  if (body.status !== undefined && body.status !== task.status) {
    const allowed = ALLOWED_TRANSITIONS[task.status] || [];
    if (!allowed.includes(body.status)) {
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        `Cannot move task from ${task.status} to ${body.status}`
      );
    }

    statusChanged = true;
    updates.status = body.status;

    if (body.status === 'completed') {
      const note = (body.completionNote || '').trim();
      if (note.length < COMPLETION_NOTE_MIN_LENGTH) {
        throw new AppError(
          400,
          'COMPLETION_NOTE_REQUIRED',
          'A completion note of at least 5 characters is required'
        );
      }
      completing = true;
      updates.completionNote = note;
      updates.completedAt = new Date();
    } else if (task.status === 'completed') {
      // Admin reopen clears the completion timestamp.
      updates.completedAt = null;
    }
  }

  if (Object.keys(updates).length > 0) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const updated = await CareTask.findOneAndUpdate(
          { _id: id, familyId, deletedAt: null, status: task.status },
          { $set: updates },
          { new: true, session }
        );
        if (!updated) {
          throw new AppError(
            409,
            'TASK_CONFLICT',
            'Task was modified by someone else; reload and retry'
          );
        }

        const actor = { actorId: req.user._id, actorName: req.user.name };
        const base = {
          familyId,
          entityType: 'task',
          entityId: updated._id,
          entityTitle: updated.title,
          ...actor,
        };

        if (assigneeChanged) {
          await activityService.log(
            {
              ...base,
              action: 'reassigned',
              meta: { from: String(task.assignedTo), to: String(updates.assignedTo) },
            },
            { session }
          );
        }

        if (completing) {
          await activityService.log(
            {
              ...base,
              action: 'completed',
              meta: { completionNote: updates.completionNote },
            },
            { session }
          );
        } else if (statusChanged) {
          await activityService.log(
            {
              ...base,
              action: 'status_changed',
              meta: { from: task.status, to: updates.status },
            },
            { session }
          );
        }

        if (changedFields.length > 0) {
          await activityService.log(
            {
              ...base,
              action: 'updated',
              meta: { fields: changedFields },
            },
            { session }
          );
        }
      });
    } finally {
      await session.endSession();
    }
  }

  const taskDto = await loadTaskDto(id, familyId);
  return res.status(200).json({
    success: true,
    data: { task: taskDto },
  });
});

const addNote = asyncHandler(async (req, res) => {
  const { fid: familyId, id } = req.params;
  const { text } = req.body;
  const isAdmin = req.membership.role === 'admin';

  const task = await CareTask.findOne({ _id: id, familyId, deletedAt: null });
  if (!task) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (task.status === 'completed' && !isAdmin) {
    throw new AppError(403, 'TASK_LOCKED', 'Completed tasks can only be changed by an admin');
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await CareTask.findOneAndUpdate(
        { _id: id, familyId, deletedAt: null },
        {
          $push: {
            notes: { author: req.user._id, text, createdAt: new Date() },
          },
        },
        { new: true, session }
      );
      if (!updated) {
        throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
      }

      await activityService.log(
        {
          familyId,
          actorId: req.user._id,
          actorName: req.user.name,
          entityType: 'task',
          entityId: updated._id,
          entityTitle: updated.title,
          action: 'note_added',
          meta: { noteLength: text.length },
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  const taskDto = await loadTaskDto(id, familyId);
  return res.status(201).json({
    success: true,
    data: { task: taskDto },
  });
});

const deleteTask = asyncHandler(async (req, res) => {
  const { fid: familyId, id } = req.params;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const deleted = await CareTask.findOneAndUpdate(
        { _id: id, familyId, deletedAt: null },
        { $set: { deletedAt: new Date() } },
        { new: true, session }
      );
      if (!deleted) {
        throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found');
      }

      await activityService.log(
        {
          familyId,
          actorId: req.user._id,
          actorName: req.user.name,
          entityType: 'task',
          entityId: deleted._id,
          entityTitle: deleted.title,
          action: 'deleted',
          meta: {},
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  return res.status(200).json({
    success: true,
    data: { taskId: id, deleted: true },
  });
});

module.exports = {
  listTasks,
  createTask,
  getTask,
  updateTask,
  addNote,
  deleteTask,
};
