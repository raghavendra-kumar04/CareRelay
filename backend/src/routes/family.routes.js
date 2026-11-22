const express = require('express');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requireFamilyMembership = require('../middleware/requireFamilyMembership');
const requireRole = require('../middleware/requireRole');
const {
  createFamilySchema,
  familyIdParams,
  memberParams,
  tokenParams,
  updateCareRecipientSchema,
  addPatientSchema,
  updatePatientSchema,
  patientParams,
} = require('../validators/family.validators');
const controller = require('../controllers/family.controller');

const router = express.Router();

router.post('/', requireAuth, validate({ body: createFamilySchema }), controller.createFamily);
router.get('/mine', requireAuth, controller.getMyFamilies);
router.post('/join/:token', requireAuth, validate({ params: tokenParams }), controller.joinByToken);
router.get(
  '/:fid',
  requireAuth,
  validate({ params: familyIdParams }),
  requireFamilyMembership,
  controller.getFamily
);
router.patch(
  '/:fid/recipient',
  requireAuth,
  validate({ params: familyIdParams, body: updateCareRecipientSchema }),
  requireFamilyMembership,
  controller.updateCareRecipient
);
router.post(
  '/:fid/patients',
  requireAuth,
  validate({ params: familyIdParams, body: addPatientSchema }),
  requireFamilyMembership,
  controller.addPatient
);
router.patch(
  '/:fid/patients/:patientId',
  requireAuth,
  validate({ params: patientParams, body: updatePatientSchema }),
  requireFamilyMembership,
  controller.updatePatient
);
router.delete(
  '/:fid/patients/:patientId',
  requireAuth,
  validate({ params: patientParams }),
  requireFamilyMembership,
  controller.deletePatient
);
router.get('/:fid/snapshot', requireAuth, requireFamilyMembership, controller.getSnapshot);
router.get(
  '/:fid/members',
  requireAuth,
  validate({ params: familyIdParams }),
  requireFamilyMembership,
  controller.getMembers
);
router.post(
  '/:fid/invite',
  requireAuth,
  validate({ params: familyIdParams }),
  requireFamilyMembership,
  requireRole('admin'),
  controller.regenerateInvite
);
router.delete(
  '/:fid/members/:userId',
  requireAuth,
  validate({ params: memberParams }),
  requireFamilyMembership,
  requireRole('admin'),
  controller.removeMember
);

module.exports = router;
