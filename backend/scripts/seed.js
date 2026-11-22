// Demonstration seed for CareRelay. Idempotent: safe to run more than once.
// Every child record is upserted by a natural key with $setOnInsert, so a re-run
// creates nothing new and changes no dates.
//
// Dates: the anchor is Riya's createdAt, written once on the first run (inside
// $setOnInsert). Every later run reads that stored value, so seeded dates and
// Activity createdAt keys never move. Run `npm run seed` against a scratch DB first.

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../src/config/env');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Family = require('../src/models/Family');
const Membership = require('../src/models/Membership');
const CareTask = require('../src/models/CareTask');
const Appointment = require('../src/models/Appointment');
const Prescription = require('../src/models/Prescription');
const Activity = require('../src/models/Activity');
const CareSummary = require('../src/models/CareSummary');
const CareChatMessage = require('../src/models/CareChatMessage');

const DEMO_PASSWORD = 'Demo@1234';
const BCRYPT_ROUNDS = 12;
const FAMILY_NAME = 'Rao Family Care';

// The User schema has no city field, so Bangalore / Hyderabad / Pune are NOT stored.
// The recipient Venkateswara Rao (72, Guntur) has no field in the Family model;
// he is mentioned in appointment notes and activity text only.
const DEMO_USERS = [
  {
    key: 'riya',
    name: 'Riya Rao',
    email: 'riya.rao@carerelay.demo',
    avatarColor: '#5C8A6E',
    role: 'admin',
    joinedHours: -60 * 24,
  },
  {
    key: 'arjun',
    name: 'Arjun Rao',
    email: 'arjun.rao@carerelay.demo',
    avatarColor: '#D4830A',
    role: 'member',
    joinedHours: -45 * 24,
  },
  {
    key: 'priya',
    name: 'Priya Rao',
    email: 'priya.rao@carerelay.demo',
    avatarColor: '#2E7D52',
    role: 'member',
    joinedHours: -40 * 24,
  },
];

// Offsets are hours relative to the anchor. Negative = past, positive = future.
const TASKS = [
  {
    title: 'Collect discharge summary from Guntur hospital',
    description: 'Get the discharge summary and scan it into the family folder.',
    category: 'document',
    priority: 'high',
    status: 'completed',
    assignee: 'arjun',
    creator: 'riya',
    createdHours: -312,
    completedHours: -200,
    completionNote: 'Summary scanned and shared in the family folder.',
  },
  {
    title: 'Refill Metformin prescription',
    description: 'Collect the monthly Metformin refill from the pharmacy.',
    category: 'medication',
    priority: 'high',
    status: 'completed',
    assignee: 'priya',
    creator: 'riya',
    createdHours: -288,
    completedHours: -100,
    completionNote: 'Refill collected from the Guntur pharmacy.',
  },
  {
    title: 'Book cab for cardiology visit',
    description: 'Arrange a cab to Guntur Heart Centre for the follow-up.',
    category: 'transport',
    priority: 'medium',
    status: 'pending',
    assignee: 'arjun',
    creator: 'riya',
    createdHours: -216,
    dueHours: 4 * 24,
  },
  {
    title: 'Send weekly update to cousins',
    description: 'Share a short health and care update in the family group.',
    category: 'communication',
    priority: 'low',
    status: 'pending',
    assignee: 'priya',
    creator: 'riya',
    createdHours: -192,
    dueHours: 6 * 24,
  },
  {
    // Overdue: pending, due 3 days before the anchor.
    title: 'Submit insurance claim for lab tests',
    description: 'Upload the lab test bills to the insurer portal.',
    category: 'document',
    priority: 'urgent',
    status: 'pending',
    assignee: 'riya',
    creator: 'riya',
    createdHours: -168,
    dueHours: -3 * 24,
  },
];

const APPOINTMENTS = [
  {
    title: 'Cardiology follow-up',
    doctorName: 'Dr. Suresh Reddy',
    clinic: 'Guntur Heart Centre',
    specialty: 'Cardiology',
    location: 'Guntur',
    dateHours: 5 * 24,
    status: 'scheduled',
    assignee: 'arjun',
    creator: 'riya',
    createdHours: -144,
    notes: 'Follow-up for Venkateswara Rao (72), Guntur. Bring the last ECG report.',
  },
  {
    title: 'Lab test: HbA1c and lipid profile',
    doctorName: '',
    clinic: 'Sri Lab Diagnostics',
    specialty: 'Pathology',
    location: 'Guntur',
    dateHours: -10 * 24,
    status: 'completed',
    assignee: 'priya',
    creator: 'riya',
    createdHours: -264,
    notes: 'Fasting blood sample for Venkateswara Rao (72), Guntur.',
  },
];

const PRESCRIPTION = {
  medicationName: 'Metformin',
  dosage: '500mg',
  frequency: 'Twice daily with meals',
  prescribedBy: 'Dr. Suresh Reddy',
  startHours: -60 * 24,
  status: 'active',
  creator: 'riya',
  notes: 'Prescribed for Venkateswara Rao (72), Guntur.',
};

// 15 activities across the last 14 days. entityType is only 'task' or 'appointment'.
const ACTIVITIES = [
  { hours: -312, actor: 'riya', entityType: 'task', title: 'Collect discharge summary from Guntur hospital', action: 'created' },
  { hours: -300, actor: 'riya', entityType: 'task', title: 'Collect discharge summary from Guntur hospital', action: 'reassigned', meta: { to: 'Arjun Rao' } },
  { hours: -288, actor: 'riya', entityType: 'task', title: 'Refill Metformin prescription', action: 'created' },
  { hours: -264, actor: 'riya', entityType: 'appointment', title: 'Lab test: HbA1c and lipid profile', action: 'created' },
  { hours: -250, actor: 'arjun', entityType: 'task', title: 'Collect discharge summary from Guntur hospital', action: 'note_added' },
  { hours: -240, actor: 'priya', entityType: 'appointment', title: 'Lab test: HbA1c and lipid profile', action: 'status_changed', meta: { from: 'scheduled', to: 'completed' } },
  { hours: -216, actor: 'riya', entityType: 'task', title: 'Book cab for cardiology visit', action: 'created' },
  { hours: -200, actor: 'arjun', entityType: 'task', title: 'Collect discharge summary from Guntur hospital', action: 'completed', meta: { completionNote: 'Summary scanned and shared in the family folder.' } },
  { hours: -192, actor: 'riya', entityType: 'task', title: 'Send weekly update to cousins', action: 'created' },
  { hours: -168, actor: 'riya', entityType: 'task', title: 'Submit insurance claim for lab tests', action: 'created' },
  { hours: -144, actor: 'riya', entityType: 'appointment', title: 'Cardiology follow-up', action: 'created' },
  { hours: -120, actor: 'arjun', entityType: 'task', title: 'Book cab for cardiology visit', action: 'note_added' },
  { hours: -100, actor: 'priya', entityType: 'task', title: 'Refill Metformin prescription', action: 'completed', meta: { completionNote: 'Refill collected from the Guntur pharmacy.' } },
  { hours: -96, actor: 'riya', entityType: 'task', title: 'Send weekly update to cousins', action: 'reassigned', meta: { to: 'Priya Rao' } },
  { hours: -36, actor: 'riya', entityType: 'task', title: 'Submit insurance claim for lab tests', action: 'note_added' },
];

const HOUR_MS = 60 * 60 * 1000;

function shift(anchor, hours) {
  return new Date(anchor.getTime() + hours * HOUR_MS);
}

// Per-collection counters for the final report.
const stats = {};
function track(name, created) {
  if (!stats[name]) stats[name] = { created: 0, present: 0 };
  stats[name][created ? 'created' : 'present'] += 1;
}

// Upserts once. $setOnInsert fields apply only on insert, so re-runs change nothing.
// Filter keys must not repeat inside insertFields. timestamps:false keeps updatedAt stable.
async function upsertOnce(Model, filter, insertFields) {
  const res = await Model.updateOne(
    filter,
    { $setOnInsert: insertFields },
    { upsert: true, timestamps: false }
  );
  return res.upsertedCount === 1;
}

async function seed() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  // Users, keyed by lowercase email.
  const users = {};
  for (const u of DEMO_USERS) {
    const now = new Date();
    const created = await upsertOnce(User, { email: u.email }, {
      name: u.name,
      passwordHash,
      avatarColor: u.avatarColor,
      createdAt: now,
      updatedAt: now,
    });
    track('Users', created);
    users[u.key] = await User.findOne({ email: u.email }).select('_id name createdAt').lean();
  }

  // The anchor is Riya's createdAt, fixed on the first run.
  const anchor = new Date(users.riya.createdAt);

  // Family: find-or-create by {name, createdBy}.
  const familyCreated = await upsertOnce(
    Family,
    { name: FAMILY_NAME, createdBy: users.riya._id },
    { createdAt: anchor, updatedAt: anchor }
  );
  track('Family', familyCreated);
  const family = await Family.findOne({ name: FAMILY_NAME, createdBy: users.riya._id }).lean();
  const familyId = family._id;

  // Memberships: upsert by {familyId, userId}; restore soft-deleted ones.
  let restoredCount = 0;
  for (const u of DEMO_USERS) {
    const userId = users[u.key]._id;
    const created = await upsertOnce(
      Membership,
      { familyId, userId },
      { role: u.role, joinedAt: shift(anchor, u.joinedHours), createdAt: anchor, updatedAt: anchor }
    );
    track('Memberships', created);
    const restored = await Membership.updateOne(
      { familyId, userId, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { timestamps: false }
    );
    restoredCount += restored.modifiedCount;
  }

  // Care tasks: keyed by {familyId, title}.
  for (const t of TASKS) {
    const created = await upsertOnce(CareTask, { familyId, title: t.title }, {
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      assignedTo: users[t.assignee]._id,
      createdBy: users[t.creator]._id,
      dueDate: t.dueHours === undefined ? null : shift(anchor, t.dueHours),
      completedAt: t.completedHours === undefined ? null : shift(anchor, t.completedHours),
      completionNote: t.completionNote || null,
      createdAt: shift(anchor, t.createdHours),
      updatedAt: shift(anchor, t.createdHours),
    });
    track('Care tasks', created);
  }

  // Appointments: keyed by {familyId, title}.
  for (const a of APPOINTMENTS) {
    const created = await upsertOnce(Appointment, { familyId, title: a.title }, {
      doctorName: a.doctorName,
      clinic: a.clinic,
      specialty: a.specialty,
      location: a.location,
      dateTime: shift(anchor, a.dateHours),
      status: a.status,
      assignedTo: users[a.assignee]._id,
      createdBy: users[a.creator]._id,
      notes: a.notes,
      createdAt: shift(anchor, a.createdHours),
      updatedAt: shift(anchor, a.createdHours),
    });
    track('Appointments', created);
  }

  // Prescription: keyed by {familyId, medicationName}.
  const rxCreated = await upsertOnce(
    Prescription,
    { familyId, medicationName: PRESCRIPTION.medicationName },
    {
      dosage: PRESCRIPTION.dosage,
      frequency: PRESCRIPTION.frequency,
      prescribedBy: PRESCRIPTION.prescribedBy,
      startDate: shift(anchor, PRESCRIPTION.startHours),
      endDate: null,
      notes: PRESCRIPTION.notes,
      status: PRESCRIPTION.status,
      createdBy: users[PRESCRIPTION.creator]._id,
      deletedAt: null,
      createdAt: anchor,
      updatedAt: anchor,
    }
  );
  track('Prescriptions', rxCreated);

  // Activities: keyed by {familyId, action, entityTitle, createdAt}.
  // Activity is immutable, so only countDocuments and insertMany are used here.
  const taskRows = await CareTask.find({
    familyId,
    title: { $in: TASKS.map((t) => t.title) },
  }).select('_id title').lean();
  const apptRows = await Appointment.find({
    familyId,
    title: { $in: APPOINTMENTS.map((a) => a.title) },
  }).select('_id title').lean();
  const entityIds = new Map([...taskRows, ...apptRows].map((r) => [r.title, r._id]));

  const missing = [];
  for (const a of ACTIVITIES) {
    const entityId = entityIds.get(a.title);
    if (!entityId) throw new Error(`Seeded record not found for activity: ${a.title}`);
    const actor = users[a.actor];
    const createdAt = shift(anchor, a.hours);
    const exists = await Activity.countDocuments({
      familyId,
      action: a.action,
      entityTitle: a.title,
      createdAt,
    });
    if (exists) {
      track('Activities', false);
    } else {
      missing.push({
        familyId,
        actorId: actor._id,
        actorName: actor.name,
        entityType: a.entityType,
        entityId,
        entityTitle: a.title,
        action: a.action,
        meta: a.meta || {},
        createdAt,
      });
    }
  }
  if (missing.length > 0) {
    await Activity.insertMany(missing);
  }
  missing.forEach(() => track('Activities', true));

  // Seed initial CareSummary if none exists
  const existingSummary = await CareSummary.findOne({ familyId, status: 'ready' });
  if (!existingSummary) {
    const actList = await Activity.find({ familyId }).limit(10).lean();
    const sourceIds = actList.map((a) => a._id);
    await CareSummary.create({
      familyId,
      requestedBy: users.riya._id,
      periodStart: shift(anchor, -7 * 24),
      periodEnd: anchor,
      status: 'ready',
      sourceActivityIds: sourceIds,
      content: {
        recentlyCompleted: [
          {
            text: 'Refill Metformin medication was completed by Priya Rao with note: "Refill collected from the Guntur pharmacy."',
            sourceIds: sourceIds.slice(0, 1),
          },
          {
            text: 'Discharge summary collected from Guntur hospital was completed by Arjun Rao and uploaded to family folder.',
            sourceIds: sourceIds.slice(1, 2),
          },
        ],
        pending: [
          {
            text: 'Submit insurance claim for lab tests is pending (urgent priority, assigned to Riya Rao).',
            sourceIds: sourceIds.slice(2, 3),
          },
          {
            text: 'Book cab for cardiology visit is pending (medium priority, assigned to Arjun Rao).',
            sourceIds: sourceIds.slice(3, 4),
          },
          {
            text: 'Send weekly update to cousins is pending (low priority, assigned to Priya Rao).',
            sourceIds: sourceIds.slice(4, 5),
          },
        ],
        overdue: [
          {
            text: 'Submit insurance claim for lab tests is overdue (assigned to Riya Rao).',
            sourceIds: sourceIds.slice(2, 3),
          },
        ],
        upcomingAppointments: [
          {
            text: 'Cardiology follow-up with Dr. Suresh Reddy at Guntur Heart Centre (accompanied by Arjun Rao).',
            sourceIds: sourceIds.slice(5, 6),
          },
        ],
        suggestedAdminActions: [
          {
            text: 'Follow up on the urgent insurance claim submission with Riya Rao.',
            sourceIds: sourceIds.slice(2, 3),
          },
          {
            text: 'Confirm cab booking with Arjun Rao 24 hours prior to the cardiology appointment.',
            sourceIds: sourceIds.slice(3, 4),
          },
        ],
      },
    });
    track('CareSummary', true);
  } else {
    track('CareSummary', false);
  }

  // Seed demo CareChatMessage conversation
  const chatCount = await CareChatMessage.countDocuments({ familyId });
  if (chatCount === 0) {
    const demoMessages = [
      {
        familyId,
        sender: users.arjun._id,
        senderName: users.arjun.name,
        role: 'user',
        message: 'What tasks are overdue for Dad this week?',
        createdAt: shift(anchor, -48),
      },
      {
        familyId,
        sender: users.riya._id,
        senderName: 'Care Assistant',
        role: 'assistant',
        message: 'Here are the overdue tasks requiring prompt attention:\n\n• **Submit insurance claim for lab tests** (urgent priority) — Due: Nov 18, 2026 | Assigned to: Riya Rao\n\nPlease check in with Riya to coordinate completion.',
        createdAt: shift(anchor, -47),
      },
      {
        familyId,
        sender: users.priya._id,
        senderName: users.priya.name,
        role: 'user',
        message: 'When is the next cardiology appointment?',
        createdAt: shift(anchor, -24),
      },
      {
        familyId,
        sender: users.riya._id,
        senderName: 'Care Assistant',
        role: 'assistant',
        message: 'Here are the upcoming appointments scheduled:\n\n• **Cardiology follow-up** with Dr. Suresh Reddy (Cardiology) on **Thursday, Nov 26 at 8:55 PM** at Guntur Heart Centre. Accompanied by: Arjun Rao.',
        createdAt: shift(anchor, -23),
      },
      {
        familyId,
        sender: users.riya._id,
        senderName: users.riya.name,
        role: 'user',
        message: 'Did we refill the Metformin prescription?',
        createdAt: shift(anchor, -6),
      },
      {
        familyId,
        sender: users.riya._id,
        senderName: 'Care Assistant',
        role: 'assistant',
        message: 'Yes! **Refill Metformin prescription** was completed by Priya Rao.\nCompletion note: *"Refill collected from the Guntur pharmacy."*',
        createdAt: shift(anchor, -5),
      },
    ];
    await CareChatMessage.insertMany(demoMessages);
    track('CareChatMessages', true);
  } else {
    track('CareChatMessages', false);
  }

  console.log(`Family _id: ${familyId}`);
  for (const [name, s] of Object.entries(stats)) {
    console.log(`${name}: created ${s.created}, already present ${s.present}`);
  }
  console.log(`Soft-deleted memberships restored: ${restoredCount}`);
}

async function main() {
  try {
    await connectDB();
    await seed();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    const raw = err && err.message ? err.message : String(err);
    // Never print the connection string, even if a driver error echoes it.
    const safe = raw.split(env.MONGODB_URI).join('[redacted]');
    console.error(`Seed failed: ${safe}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();
