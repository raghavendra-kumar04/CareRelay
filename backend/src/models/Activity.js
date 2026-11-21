const { Schema, model } = require('mongoose');

const activitySchema = new Schema(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true, trim: true, maxlength: 200 },
    entityType: { type: String, enum: ['task', 'appointment'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityTitle: { type: String, required: true, trim: true, maxlength: 200 },
    action: {
      type: String,
      required: true,
      enum: ['created', 'updated', 'reassigned', 'status_changed', 'completed', 'note_added', 'deleted'],
    },
    meta: { type: Schema.Types.Mixed, default: {} },
    // Activity log is append-only: no updatedAt, and createdAt can never be changed.
    createdAt: { type: Date, default: Date.now, immutable: true },
  }
);

activitySchema.index({ familyId: 1, createdAt: -1 });
activitySchema.index({ familyId: 1, entityType: 1, createdAt: -1 });
activitySchema.index({ entityId: 1, createdAt: -1 });

// Application-level immutability: block every update/delete query path.
const blockedQueryHooks = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'findOneAndRemove',
  'deleteOne',
  'deleteMany',
  'replaceOne',
  'remove',
];

blockedQueryHooks.forEach((name) => {
  activitySchema.pre(name, function () {
    throw new Error('Activity records are immutable');
  });
});

// Documents may be inserted once; re-saving an existing record is rejected.
activitySchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error('Activity records are immutable'));
  next();
});

module.exports = model('Activity', activitySchema);
