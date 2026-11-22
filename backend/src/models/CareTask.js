const { Schema, model } = require('mongoose');

const noteSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, trim: true, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const careTaskSchema = new Schema(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    category: {
      type: String,
      enum: ['appointment', 'medication', 'document', 'transport', 'communication', 'other'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completionNote: { type: String, trim: true, maxlength: 500, default: null },
    notes: { type: [noteSchema], default: [] },
    relatedAppointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', default: null },
    patientId: { type: Schema.Types.ObjectId, default: null },
    patientName: { type: String, trim: true, default: '' },
    // Soft delete: documents are never hard-deleted; deletedAt marks removal.
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

careTaskSchema.index({ familyId: 1, status: 1 });
careTaskSchema.index({ familyId: 1, assignedTo: 1 });
careTaskSchema.index({ familyId: 1, dueDate: 1 });
careTaskSchema.index({ familyId: 1, deletedAt: 1 });

careTaskSchema.pre('validate', function () {
  if (this.status === 'completed' && (!this.completionNote || this.completionNote.trim().length < 5)) {
    this.invalidate(
      'completionNote',
      'Completion note must be at least 5 characters when completing a task'
    );
  }
});

module.exports = model('CareTask', careTaskSchema);
