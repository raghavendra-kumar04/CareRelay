const express = require('express');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requireFamilyMembership = require('../middleware/requireFamilyMembership');
const { listActivitiesQuery } = require('../validators/activities.validators');
const { listActivities } = require('../controllers/activities.controller');

// Mounted at /api/families/:fid/activities, so :fid comes from the parent path.
const router = express.Router({ mergeParams: true });

router.get(
  '/',
  requireAuth,
  requireFamilyMembership,
  validate({ query: listActivitiesQuery.query }),
  listActivities
);

module.exports = router;
