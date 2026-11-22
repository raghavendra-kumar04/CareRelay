const { Schema, model } = require('mongoose');

const patientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    relationship: { type: String, default: 'Parent', trim: true, maxlength: 80 },
    age: { type: Number, default: 70, min: 0, max: 150 },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
    condition: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    location: { type: String, default: 'Guntur, Andhra Pradesh', trim: true, maxlength: 150 },
    primaryLanguage: { type: String, default: 'Telugu, English', trim: true, maxlength: 100 },
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const familySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteToken: { type: String, unique: true, sparse: true },
    inviteTokenExpiresAt: { type: Date, default: null },
    // Multi-Patient Support: An array of care recipients tracked by the family circle
    patients: {
      type: [patientSchema],
      default: () => [
        {
          name: 'Venkateswara Rao',
          relationship: 'Father',
          age: 72,
          gender: 'Male',
          condition: 'Cardiology recovery, Type 2 Diabetes, Hypertension',
          location: 'Guntur, Andhra Pradesh',
          primaryLanguage: 'Telugu, English',
          notes: '',
          isPrimary: true,
        },
      ],
    },
    // Backwards-compatible single careRecipient schema
    careRecipient: {
      type: Schema.Types.Mixed,
      default: () => ({
        name: 'Venkateswara Rao',
        relationship: 'Father',
        age: 72,
        condition: 'Cardiology recovery, Type 2 Diabetes, Hypertension',
        location: 'Guntur, Andhra Pradesh',
        primaryLanguage: 'Telugu, English',
        notes: '',
      }),
    },
  },
  { timestamps: true }
);

module.exports = model('Family', familySchema);
