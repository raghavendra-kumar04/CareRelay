const { Schema, model } = require('mongoose');

const appointmentSchema = new Schema(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    doctorName: { type: String, trim: true, maxlength: 100, default: '' },
    clinic: { type: String, trim: true, maxlength: 150, default: '' },
    specialty: { type: String, trim: true, maxlength: 80, default: '' },
    dateTime: { type: Date, required: true },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    patientId: { type: Schema.Types.ObjectId, default: null },
    patientName: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    // Soft delete: documents are never hard-deleted; deletedAt marks removal.
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

appointmentSchema.index({ familyId: 1, dateTime: 1 });
appointmentSchema.index({ familyId: 1, status: 1 });
appointmentSchema.index({ familyId: 1, deletedAt: 1 });

module.exports = model('Appointment', appointmentSchema);
