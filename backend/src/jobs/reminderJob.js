const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const socketService = require('../services/socketService');

function startReminderJob() {
  // Runs every hour on minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      // Find appointments in the 24-25 hour window
      const upcomingAppointments = await Appointment.find({
        status: 'scheduled',
        deletedAt: null,
        dateTime: { $gte: in24Hours, $lte: in25Hours },
      }).populate('assignedTo', 'name email');

      for (const appt of upcomingAppointments) {
        socketService.emitToFamily(appt.familyId, 'reminder:upcoming', {
          entityType: 'appointment',
          entityId: String(appt._id),
          title: appt.title,
          dateTime: appt.dateTime,
          assignedTo: appt.assignedTo,
          message: `Appointment "${appt.title}" is in 24 hours.`,
        });
      }

      // Check upcoming prescription refills (within next 48 hours)
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const upcomingRefills = await Prescription.find({
        status: 'active',
        deletedAt: null,
        refillDueDate: { $gte: now, $lte: in48Hours },
      });

      for (const rx of upcomingRefills) {
        socketService.emitToFamily(rx.familyId, 'reminder:upcoming', {
          entityType: 'prescription',
          entityId: String(rx._id),
          title: rx.medicationName,
          refillDueDate: rx.refillDueDate,
          message: `Medicine refill due soon for "${rx.medicationName}".`,
        });
      }
    } catch (err) {
      console.error('Reminder job error:', err);
    }
  });

  console.log('Hourly reminder job scheduled.');
}

module.exports = { startReminderJob };
