const express = require('express');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requireFamilyMembership = require('../middleware/requireFamilyMembership');
const requireRole = require('../middleware/requireRole');
const {
  taskParams,
  listTasksQuery,
  createTaskSchema,
  updateTaskSchema,
  addNoteSchema,
} = require('../validators/tasks.validators');
const controller = require('../controllers/tasks.controller');

// Mounted at /api/families/:fid/tasks, so :fid comes from the parent path.
const router = express.Router({ mergeParams: true });

router.get(
  '/',
  requireAuth,
  requireFamilyMembership,
  validate({ query: listTasksQuery.query }),
  controller.listTasks
);
router.post(
  '/',
  requireAuth,
  requireFamilyMembership,
  validate({ body: createTaskSchema.body }),
  controller.createTask
);
router.get(
  '/:id',
  requireAuth,
  requireFamilyMembership,
  validate({ params: taskParams.params }),
  controller.getTask
);
router.patch(
  '/:id',
  requireAuth,
  requireFamilyMembership,
  validate({ params: taskParams.params, body: updateTaskSchema.body }),
  controller.updateTask
);
router.post(
  '/:id/notes',
  requireAuth,
  requireFamilyMembership,
  validate({ params: taskParams.params, body: addNoteSchema.body }),
  controller.addNote
);
router.delete(
  '/:id',
  requireAuth,
  requireFamilyMembership,
  requireRole('admin'),
  validate({ params: taskParams.params }),
  controller.deleteTask
);

module.exports = router;
