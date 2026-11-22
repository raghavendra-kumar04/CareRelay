const express = require('express');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requireFamilyMembership = require('../middleware/requireFamilyMembership');
const requireRole = require('../middleware/requireRole');
const {
  appointmentParams,
  listAppointmentsQuery,
  createAppointmentSchema,
  updateAppointmentSchema,
} = require('../validators/appointments.validators');
const controller = require('../controllers/appointments.controller');

// Mounted at /api/families/:fid/appointments, so :fid is merged
const router = express.Router({ mergeParams: true });

router.get(
  '/',
  requireAuth,
  requireFamilyMembership,
  validate({ query: listAppointmentsQuery.query }),
  controller.listAppointments
);

router.post(
  '/',
  requireAuth,
  requireFamilyMembership,
  validate({ body: createAppointmentSchema.body }),
  controller.createAppointment
);

router.get(
  '/:id',
  requireAuth,
  requireFamilyMembership,
  validate({ params: appointmentParams.params }),
  controller.getAppointment
);

router.patch(
  '/:id',
  requireAuth,
  requireFamilyMembership,
  validate({ params: appointmentParams.params, body: updateAppointmentSchema.body }),
  controller.updateAppointment
);

router.delete(
  '/:id',
  requireAuth,
  requireFamilyMembership,
  validate({ params: appointmentParams.params }),
  controller.deleteAppointment
);

module.exports = router;
