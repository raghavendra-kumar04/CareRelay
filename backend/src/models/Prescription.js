const { Schema, model } = require('mongoose');

const prescriptionSchema = new Schema(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    medicationName: { type: String, required: true, trim: true, maxlength: 200 },
    // Text fields only: no clinical interpretation.
    dosage: { type: String, trim: true, maxlength: 100 },
    frequency: { type: String, trim: true, maxlength: 200 },
    prescribedBy: { type: String, trim: true, maxlength: 100 },
    startDate: { type: Date },
    endDate: { type: Date, default: null },
    // PRD field (B-06 / Prescriptions schema): drives refill reminders.
    refillDueDate: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    status: {
      type: String,
      enum: ['active', 'completed', 'discontinued'],
      default: 'active',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    // Soft delete: documents are never hard-deleted; deletedAt marks removal.
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

prescriptionSchema.index({ familyId: 1, deletedAt: 1 });
prescriptionSchema.index({ familyId: 1, refillDueDate: 1 });

module.exports = model('Prescription', prescriptionSchema);
