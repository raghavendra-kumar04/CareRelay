const CareSummary = require('../models/CareSummary');
const Activity = require('../models/Activity');
const CareChatMessage = require('../models/CareChatMessage');
const aiService = require('../services/aiService');
const socketService = require('../services/socketService');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const GENERIC_GENERATION_FAILED = 'The summary could not be generated. Please try again.';

// Only safe, non-user fields leave the server. No emails, tokens or raw user documents.
function mapItems(items) {
  return (items || []).map((item) => ({
    text: item.text,
    sourceIds: (item.sourceIds || []).map(String),
  }));
}

function toSummaryDto(doc) {
  const content = doc.content || {};
  return {
    _id: String(doc._id),
    familyId: String(doc.familyId),
    status: doc.status,
    patientId: doc.patientId ? String(doc.patientId) : null,
    patientName: doc.patientName || '',
    errorCode: doc.errorCode ?? null,
    periodStart: doc.periodStart,
    periodEnd: doc.periodEnd,
    content: {
      recentlyCompleted: mapItems(content.recentlyCompleted),
      pending: mapItems(content.pending),
      overdue: mapItems(content.overdue),
      upcomingAppointments: mapItems(content.upcomingAppointments),
      suggestedAdminActions: mapItems(content.suggestedAdminActions),
    },
    disclaimer: doc.disclaimer,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    requestedBy: String(doc.requestedBy),
  };
}

const generateSummary = asyncHandler(async (req, res) => {
  const familyId = req.params.fid;
  const requestedBy = req.user._id;
  const patientId = req.body?.patientId || req.query?.patientId || null;
  const patientName = req.body?.patientName || req.query?.patientName || '';
  const { periodStart, periodEnd } = aiService.getSummaryPeriod();

  const mongoose = require('mongoose');
  const validPatientObjectId = patientId && mongoose.Types.ObjectId.isValid(patientId)
    ? new mongoose.Types.ObjectId(patientId)
    : null;

  const doc = await CareSummary.create({
    familyId,
    requestedBy,
    patientId: validPatientObjectId,
    patientName,
    periodStart,
    periodEnd,
    status: 'generating',
  });

  let result;
  try {
    result = await aiService.generateFamilySummary({ familyId, requestedBy, patientId, patientName });
  } catch (err) {
    const isAppError = err instanceof AppError;
    await CareSummary.updateOne(
      { _id: doc._id, familyId },
      { $set: { status: 'failed', errorCode: isAppError ? err.code : 'AI_GENERATION_FAILED' } }
    );
    if (isAppError) throw err;
    throw new AppError(502, 'AI_GENERATION_FAILED', GENERIC_GENERATION_FAILED);
  }

  const saved = await CareSummary.findOneAndUpdate(
    { _id: doc._id, familyId },
    {
      $set: {
        status: 'ready',
        errorCode: null,
        content: result.content,
        sourceActivityIds: result.sourceActivityIds,
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
      },
    },
    { new: true }
  ).lean();

  const dto = toSummaryDto(saved);

  try {
    socketService.emitToFamily(String(familyId), 'summary:ready', { summary: dto });
  } catch (err) {
    console.error('summary:ready emit failed:', err.message);
  }

  res.status(201).json({ success: true, data: { summary: dto } });
});

const listSummaries = asyncHandler(async (req, res) => {
  const { page, limit, patientId } = req.validatedQuery;
  const filter = { familyId: req.params.fid };

  if (patientId && patientId !== 'all') {
    const mongoose = require('mongoose');
    const Family = require('../models/Family');
    const family = await Family.findById(req.params.fid).lean();
    const primaryPatientId = family?.patients?.[0]?._id ? String(family.patients[0]._id) : null;
    const isPrimary = primaryPatientId && String(patientId) === primaryPatientId;
    const isObjectId = mongoose.Types.ObjectId.isValid(patientId);
    const pObjectId = isObjectId ? new mongoose.Types.ObjectId(patientId) : null;

    if (isPrimary) {
      filter.$or = [
        ...(pObjectId ? [{ patientId: pObjectId }] : []),
        { patientId: null },
        { patientId: { $exists: false } },
      ];
    } else if (pObjectId) {
      filter.patientId = pObjectId;
    } else {
      filter.patientId = patientId;
    }
  }

  const [summaries, total] = await Promise.all([
    CareSummary.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CareSummary.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: summaries.map(toSummaryDto),
    pagination: { page, limit, total },
  });
});

const getSummary = asyncHandler(async (req, res) => {
  const familyId = req.params.fid;

  const doc = await CareSummary.findOne({ _id: req.params.id, familyId }).lean();
  if (!doc) {
    throw new AppError(404, 'SUMMARY_NOT_FOUND', 'Summary not found');
  }

  const activities = await Activity.find({
    familyId,
    _id: { $in: doc.sourceActivityIds || [] },
  })
    .sort({ createdAt: -1 })
    .lean();

  const sourceActivities = activities.map((activity) => ({
    _id: activity._id,
    actorName: activity.actorName,
    entityType: activity.entityType,
    entityTitle: activity.entityTitle,
    action: activity.action,
    createdAt: activity.createdAt,
  }));

  res.json({
    success: true,
    data: { summary: toSummaryDto(doc), sourceActivities },
  });
});

const getChatHistory = asyncHandler(async (req, res) => {
  const familyId = req.params.fid;
  const messages = await CareChatMessage.find({ familyId, deletedAt: null })
    .sort({ createdAt: 1 })
    .limit(60)
    .lean();

  res.json({
    success: true,
    data: { messages },
  });
});

const sendChatMessage = asyncHandler(async (req, res) => {
  const familyId = req.params.fid;
  const { message, patientId, patientName } = req.body;
  const userName = req.user?.name || 'Family Member';

  const userDoc = await CareChatMessage.create({
    familyId,
    sender: req.user._id,
    senderName: userName,
    role: 'user',
    message,
  });

  try {
    socketService.emitToFamily(String(familyId), 'chat:message', { message: userDoc });
  } catch (err) {
    console.error('Socket emit chat:message error:', err.message);
  }

  const assistantResponse = await aiService.answerFamilyQuery({
    familyId,
    userQuery: message,
    userName,
    userId: req.user._id,
    patientId,
    patientName,
  });

  const assistantDoc = await CareChatMessage.create({
    familyId,
    sender: req.user._id,
    senderName: 'Care Assistant',
    role: 'assistant',
    message: assistantResponse,
  });

  try {
    socketService.emitToFamily(String(familyId), 'chat:message', { message: assistantDoc });
  } catch (err) {
    console.error('Socket emit chat:message error:', err.message);
  }

  res.status(201).json({
    success: true,
    data: {
      userMessage: userDoc,
      assistantMessage: assistantDoc,
    },
  });
});

module.exports = { generateSummary, listSummaries, getSummary, getChatHistory, sendChatMessage };
