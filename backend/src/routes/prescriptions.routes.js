const express = require('express');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requireFamilyMembership = require('../middleware/requireFamilyMembership');
const requireRole = require('../middleware/requireRole');
const {
  prescriptionParams,
  listPrescriptionsQuery,
  createPrescriptionSchema,
  updatePrescriptionSchema,
} = require('../validators/prescriptions.validators');
const controller = require('../controllers/prescriptions.controller');

const router = express.Router({ mergeParams: true });

router.get(
  '/',
  requireAuth,
  requireFamilyMembership,
  validate({ query: listPrescriptionsQuery.query }),
  controller.listPrescriptions
);

router.post(
  '/',
  requireAuth,
  requireFamilyMembership,
  validate({ body: createPrescriptionSchema.body }),
  controller.createPrescription
);

router.get(
  '/:id',
  requireAuth,
  requireFamilyMembership,
  validate({ params: prescriptionParams.params }),
  controller.getPrescription
);

router.patch(
  '/:id',
  requireAuth,
  requireFamilyMembership,
  validate({ params: prescriptionParams.params, body: updatePrescriptionSchema.body }),
  controller.updatePrescription
);

router.delete(
  '/:id',
  requireAuth,
  requireFamilyMembership,
  requireRole('admin'),
  validate({ params: prescriptionParams.params }),
  controller.deletePrescription
);

module.exports = router;
