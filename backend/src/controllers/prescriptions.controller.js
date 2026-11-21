const Prescription = require('../models/Prescription');
const activityService = require('../services/activityService');
const socketService = require('../services/socketService');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

function toPrescriptionDto(doc) {
  return {
    _id: String(doc._id),
    familyId: String(doc.familyId),
    medicationName: doc.medicationName,
    dosage: doc.dosage || '',
    frequency: doc.frequency || '',
    prescribedBy: doc.prescribedBy || '',
    startDate: doc.startDate,
    endDate: doc.endDate,
    refillDueDate: doc.refillDueDate,
    notes: doc.notes || '',
    status: doc.status,
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const createPrescription = asyncHandler(async (req, res) => {
  const { fid } = req.params;

  const prescription = await Prescription.create({
    ...req.body,
    familyId: fid,
    createdBy: req.user._id,
  });

  const dto = toPrescriptionDto(prescription);

  try {
    const activityDoc = await activityService.log({
      familyId: fid,
      actorId: req.user._id,
      actorName: req.user.name,
      entityType: 'prescription',
      entityId: prescription._id,
      entityTitle: prescription.medicationName,
      action: 'created',
      meta: {
        dosage: prescription.dosage,
        refillDueDate: prescription.refillDueDate,
      },
    });

    socketService.emitToFamily(fid, 'activity:new', {
      activity: {
        _id: String(activityDoc._id),
        familyId: String(activityDoc.familyId),
        actorId: String(activityDoc.actorId),
        actorName: activityDoc.actorName,
        entityType: activityDoc.entityType,
        entityId: String(activityDoc.entityId),
        entityTitle: activityDoc.entityTitle,
        action: activityDoc.action,
        meta: activityDoc.meta,
        createdAt: activityDoc.createdAt,
      },
    });
  } catch (err) {
    console.error('Failed to log prescription activity:', err);
  }

  return res.status(201).json({
    success: true,
    data: { prescription: dto },
  });
});

const listPrescriptions = asyncHandler(async (req, res) => {
  const { fid } = req.params;
  const { status, page = 1, limit = 20 } = req.query;

  const filter = { familyId: fid, deletedAt: null };
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Prescription.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Prescription.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      prescriptions: items.map(toPrescriptionDto),
      pagination: { page, limit, total },
    },
  });
});

const getPrescription = asyncHandler(async (req, res) => {
  const { fid, id } = req.params;

  const doc = await Prescription.findOne({ _id: id, familyId: fid, deletedAt: null });
  if (!doc) {
    throw new AppError(404, 'PRESCRIPTION_NOT_FOUND', 'Prescription not found');
  }

  return res.status(200).json({
    success: true,
    data: { prescription: toPrescriptionDto(doc) },
  });
});

const updatePrescription = asyncHandler(async (req, res) => {
  const { fid, id } = req.params;

  const doc = await Prescription.findOne({ _id: id, familyId: fid, deletedAt: null });
  if (!doc) {
    throw new AppError(404, 'PRESCRIPTION_NOT_FOUND', 'Prescription not found');
  }

  Object.assign(doc, req.body);
  await doc.save();

  const dto = toPrescriptionDto(doc);

  try {
    const activityDoc = await activityService.log({
      familyId: fid,
      actorId: req.user._id,
      actorName: req.user.name,
      entityType: 'prescription',
      entityId: doc._id,
      entityTitle: doc.medicationName,
      action: 'updated',
    });

    socketService.emitToFamily(fid, 'activity:new', {
      activity: {
        _id: String(activityDoc._id),
        familyId: String(activityDoc.familyId),
        actorId: String(activityDoc.actorId),
        actorName: activityDoc.actorName,
        entityType: activityDoc.entityType,
        entityId: String(activityDoc.entityId),
        entityTitle: activityDoc.entityTitle,
        action: activityDoc.action,
        meta: activityDoc.meta,
        createdAt: activityDoc.createdAt,
      },
    });
  } catch (err) {
    console.error('Failed to log prescription activity:', err);
  }

  return res.status(200).json({
    success: true,
    data: { prescription: dto },
  });
});

const deletePrescription = asyncHandler(async (req, res) => {
  const { fid, id } = req.params;

  const doc = await Prescription.findOne({ _id: id, familyId: fid, deletedAt: null });
  if (!doc) {
    throw new AppError(404, 'PRESCRIPTION_NOT_FOUND', 'Prescription not found');
  }

  doc.deletedAt = new Date();
  await doc.save();

  try {
    const activityDoc = await activityService.log({
      familyId: fid,
      actorId: req.user._id,
      actorName: req.user.name,
      entityType: 'prescription',
      entityId: doc._id,
      entityTitle: doc.medicationName,
      action: 'deleted',
    });

    socketService.emitToFamily(fid, 'activity:new', {
      activity: {
        _id: String(activityDoc._id),
        familyId: String(activityDoc.familyId),
        actorId: String(activityDoc.actorId),
        actorName: activityDoc.actorName,
        entityType: activityDoc.entityType,
        entityId: String(activityDoc.entityId),
        entityTitle: activityDoc.entityTitle,
        action: activityDoc.action,
        meta: activityDoc.meta,
        createdAt: activityDoc.createdAt,
      },
    });
  } catch (err) {
    console.error('Failed to log prescription activity:', err);
  }

  return res.status(200).json({
    success: true,
    data: { message: 'Prescription deleted successfully', id },
  });
});

module.exports = {
  createPrescription,
  listPrescriptions,
  getPrescription,
  updatePrescription,
  deletePrescription,
};
