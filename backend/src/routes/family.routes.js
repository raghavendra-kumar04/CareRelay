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
