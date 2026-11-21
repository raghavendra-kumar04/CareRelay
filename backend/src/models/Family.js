const { Schema, model } = require('mongoose');

const familySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteToken: { type: String, unique: true, sparse: true },
    inviteTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = model('Family', familySchema);
