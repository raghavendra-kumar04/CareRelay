const { asyncHandler } = require('../middleware/errorHandler');
const activityService = require('../services/activityService');
const CareTask = require('../models/CareTask');
const Appointment = require('../models/Appointment');
const Membership = require('../models/Membership');

function toActivityDto(activity, taskMap = new Map(), apptMap = new Map(), userMap = new Map()) {
  let assignedTo = null;
  let assignedBy = null;

  if (activity.entityType === 'task') {
    const task = taskMap.get(String(activity.entityId));
    if (task) {
      if (task.assignedTo) {
        assignedTo = {
          _id: String(task.assignedTo._id),
          name: task.assignedTo.name,
          avatarColor: task.assignedTo.avatarColor,
        };
      }
      if (task.createdBy) {
        assignedBy = {
          _id: String(task.createdBy._id),
          name: task.createdBy.name,
          avatarColor: task.createdBy.avatarColor,
        };
      }
    }
    if (activity.action === 'reassigned' && activity.meta?.to) {
      const u = userMap.get(String(activity.meta.to));
      if (u) assignedTo = u;
    }
  } else if (activity.entityType === 'appointment') {
    const appt = apptMap.get(String(activity.entityId));
    if (appt) {
      if (appt.assignedTo) {
        assignedTo = {
          _id: String(appt.assignedTo._id),
          name: appt.assignedTo.name,
          avatarColor: appt.assignedTo.avatarColor,
        };
      }
      if (appt.createdBy) {
        assignedBy = {
          _id: String(appt.createdBy._id),
          name: appt.createdBy.name,
          avatarColor: appt.createdBy.avatarColor,
        };
      }
    }
  }

  // Fallbacks if entity was soft-deleted or meta has raw assignee/creator
  if (!assignedTo && activity.meta?.assignedTo) {
    const u = userMap.get(String(activity.meta.assignedTo));
    if (u) assignedTo = u;
  }
  if (!assignedBy && activity.action === 'created') {
    assignedBy = {
      _id: String(activity.actorId),
      name: activity.actorName,
    };
  }

  const task = activity.entityType === 'task' ? taskMap.get(String(activity.entityId)) : null;
  const appt = activity.entityType === 'appointment' ? apptMap.get(String(activity.entityId)) : null;
  const patientName = task?.patientName || appt?.patientName || activity.meta?.patientName || null;
  const patientId = task?.patientId || appt?.patientId || activity.meta?.patientId || null;

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
    assignedTo,
    assignedBy,
    patientId: patientId ? String(patientId) : null,
    patientName: patientName || null,
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

  const taskIds = items.filter((a) => a.entityType === 'task').map((a) => a.entityId);
  const apptIds = items.filter((a) => a.entityType === 'appointment').map((a) => a.entityId);

  const [tasks, appts, memberships] = await Promise.all([
    taskIds.length > 0
      ? CareTask.find({ _id: { $in: taskIds }, familyId: fid })
          .populate('assignedTo', 'name avatarColor')
          .populate('createdBy', 'name avatarColor')
          .lean()
      : [],
    apptIds.length > 0
      ? Appointment.find({ _id: { $in: apptIds }, familyId: fid })
          .populate('assignedTo', 'name avatarColor')
          .populate('createdBy', 'name avatarColor')
          .lean()
      : [],
    Membership.find({ familyId: fid })
      .populate('userId', 'name avatarColor')
      .lean(),
  ]);

  const taskMap = new Map(tasks.map((t) => [String(t._id), t]));
  const apptMap = new Map(appts.map((a) => [String(a._id), a]));
  const userMap = new Map();
  memberships.forEach((m) => {
    if (m.userId && m.userId._id) {
      userMap.set(String(m.userId._id), {
        _id: String(m.userId._id),
        name: m.userId.name,
        avatarColor: m.userId.avatarColor,
      });
    }
  });

  return res.status(200).json({
    success: true,
    data: items.map((act) => toActivityDto(act, taskMap, apptMap, userMap)),
    pagination: { page, limit, total },
  });
});

module.exports = { listActivities };
