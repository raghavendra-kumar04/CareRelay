const { Schema, model } = require('mongoose');

const DEFAULT_DISCLAIMER =
  'This summary is generated from recorded family activity logs and is for coordination purposes only. It does not provide medical advice. All medical decisions must be made by a qualified healthcare professional.';

// One grounded statement. sourceIds reference Activity, CareTask or Appointment documents.
const itemSchema = new Schema(
  {
    text: { type: String, trim: true, maxlength: 300 },
    sourceIds: { type: [Schema.Types.ObjectId], default: [] },
  },
  { _id: false }
);

const careSummarySchema = new Schema(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['generating', 'ready', 'failed'],
      default: 'generating',
    },
    sourceActivityIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Activity' }], default: [] },
    content: {
      recentlyCompleted: { type: [itemSchema], default: [] },
      pending: { type: [itemSchema], default: [] },
      overdue: { type: [itemSchema], default: [] },
      upcomingAppointments: { type: [itemSchema], default: [] },
      suggestedAdminActions: { type: [itemSchema], default: [] },
    },
    disclaimer: { type: String, default: DEFAULT_DISCLAIMER },
    // A safe, fixed error code only (never a raw provider message).
    errorCode: { type: String, default: null },
  },
  { timestamps: true }
);

careSummarySchema.index({ familyId: 1, createdAt: -1 });

module.exports = model('CareSummary', careSummarySchema);
