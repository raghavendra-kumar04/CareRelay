const { Schema, model } = require('mongoose');

const membershipSchema = new Schema(
  {
    familyId: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], required: true },
    joinedAt: { type: Date, default: Date.now },
    // Soft delete: removed memberships keep their document with deletedAt set.
    // Rejoining must reuse this document so the unique index is never violated.
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

membershipSchema.index({ familyId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1 });

module.exports = model('Membership', membershipSchema);
