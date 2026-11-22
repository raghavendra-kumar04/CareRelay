const express = require('express');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requireFamilyMembership = require('../middleware/requireFamilyMembership');
const { summaryIdParams, listSummariesQuery, chatMessageBody } = require('../validators/summary.validators');
const controller = require('../controllers/summary.controller');

// Expects :fid from the parent mount path (app.js owns the mount point).
const router = express.Router({ mergeParams: true });

// Care Assistant Chat routes
router.get(
  '/chat',
  requireAuth,
  requireFamilyMembership,
  controller.getChatHistory
);
router.post(
  '/chat',
  requireAuth,
  requireFamilyMembership,
  validate({ body: chatMessageBody.body }),
  controller.sendChatMessage
);

// Any active family member may request a summary (no requireRole).
router.post(
  '/generate',
  requireAuth,
  requireFamilyMembership,
  controller.generateSummary
);
router.get(
  '/',
  requireAuth,
  requireFamilyMembership,
  validate({ query: listSummariesQuery.query }),
  controller.listSummaries
);
router.get(
  '/:id',
  requireAuth,
  requireFamilyMembership,
  validate({ params: summaryIdParams.params }),
  controller.getSummary
);

module.exports = router;
