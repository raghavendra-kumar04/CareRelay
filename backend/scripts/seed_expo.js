// Demo seed script for Project Expo and Screen Recording
// Cleans test patients ("asdfghjkl", "jflkjakl;jfkj", and verification families)
// Seeds rich, realistic, presentation-ready multi-patient data for Rao Family Care:
//   1. Venkateswara Rao (Father, 72, Cardiology & Diabetes)
//   2. Kamala Rao (Mother, 68, Knee Osteoarthritis & Mobility)

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
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
const BCRYPT_ROUNDS = 10;
const FAMILY_NAME = 'Rao Family Care';

async function run() {
  await connectDB();
  console.log('--- Cleaning test data ---');

  // 1. Delete transient "Verification Family" records from test runs
  const verificationFamilies = await Family.find({ name: /Verification Family/i }).lean();
  for (const vf of verificationFamilies) {
    await Membership.deleteMany({ familyId: vf._id });
    await CareTask.deleteMany({ familyId: vf._id });
    await Appointment.deleteMany({ familyId: vf._id });
    await Prescription.deleteMany({ familyId: vf._id });
    await Activity.collection.deleteMany({ familyId: vf._id });
    await CareSummary.deleteMany({ familyId: vf._id });
    await CareChatMessage.deleteMany({ familyId: vf._id });
    await Family.deleteOne({ _id: vf._id });
  }
  console.log(`Cleaned ${verificationFamilies.length} temporary verification families.`);

  // 2. Ensure core demo users exist
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const userDefs = [
    { key: 'riya', name: 'Riya Rao', email: 'riya.rao@carerelay.demo', avatarColor: '#5C8A6E', role: 'admin' },
    { key: 'arjun', name: 'Arjun Rao', email: 'arjun.rao@carerelay.demo', avatarColor: '#D4830A', role: 'member' },
    { key: 'priya', name: 'Priya Rao', email: 'priya.rao@carerelay.demo', avatarColor: '#2E7D52', role: 'member' },
  ];

  const users = {};
  for (const u of userDefs) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create({
        name: u.name,
        email: u.email,
        passwordHash,
        avatarColor: u.avatarColor,
      });
    }
    users[u.key] = user;
  }

  // 3. Find or create Rao Family Care
  let family = await Family.findOne({ name: FAMILY_NAME });
  if (!family) {
    family = await Family.create({
      name: FAMILY_NAME,
      createdBy: users.riya._id,
      careRecipient: {
        name: 'Venkateswara Rao',
        relationship: 'Father',
        age: 72,
        condition: 'Cardiology recovery, Type 2 Diabetes, Hypertension',
        location: 'Guntur, Andhra Pradesh',
        primaryLanguage: 'Telugu, English',
        notes: 'Post-angioplasty recovery. Requires low-sodium diet and daily BP tracking.',
      },
    });
  }

  // Ensure memberships for all 3 siblings
  for (const u of userDefs) {
    const existing = await Membership.findOne({ familyId: family._id, userId: users[u.key]._id });
    if (!existing) {
      await Membership.create({
        familyId: family._id,
        userId: users[u.key]._id,
        role: u.role,
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });
    }
  }

  // 4. Clean out bad patients ("asdfghjkl", "jflkjakl;jfkj", etc.)
  const existingPatients = family.patients || [];
  const badPatientIds = [];
  const filteredPatients = [];

  for (const p of existingPatients) {
    const lowerName = (p.name || '').toLowerCase();
    if (lowerName.includes('asdf') || lowerName.includes('jflk') || lowerName.includes('jfik')) {
      badPatientIds.push(p._id);
    } else {
      filteredPatients.push(p);
    }
  }

  // Delete records attached to bad patient IDs
  if (badPatientIds.length > 0) {
    await CareTask.deleteMany({ familyId: family._id, patientId: { $in: badPatientIds } });
    await Appointment.deleteMany({ familyId: family._id, patientId: { $in: badPatientIds } });
    await Prescription.deleteMany({ familyId: family._id, patientId: { $in: badPatientIds } });
    await Activity.collection.deleteMany({ familyId: family._id, 'meta.patientId': { $in: badPatientIds } });
    await CareSummary.deleteMany({ familyId: family._id, patientId: { $in: badPatientIds } });
  }

  // 5. Establish the two clean patients
  // Patient 1: Venkateswara Rao (Father)
  let father = filteredPatients.find((p) => p.name === 'Venkateswara Rao');
  if (!father) {
    father = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Venkateswara Rao',
      relationship: 'Father',
      age: 72,
      gender: 'Male',
      condition: 'Cardiology recovery, Type 2 Diabetes, Hypertension',
      location: 'Guntur, Andhra Pradesh',
      primaryLanguage: 'Telugu, English',
      notes: 'Post-angioplasty recovery. Requires low-sodium diet and daily BP tracking.',
      isPrimary: true,
    };
  } else {
    father.relationship = 'Father';
    father.age = 72;
    father.gender = 'Male';
    father.condition = 'Cardiology recovery, Type 2 Diabetes, Hypertension';
    father.location = 'Guntur, Andhra Pradesh';
    father.primaryLanguage = 'Telugu, English';
    father.notes = 'Post-angioplasty recovery. Requires low-sodium diet and daily BP tracking.';
    father.isPrimary = true;
  }

  // Patient 2: Kamala Rao (Mother)
  let mother = filteredPatients.find((p) => p.name === 'Kamala Rao');
  if (!mother) {
    mother = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Kamala Rao',
      relationship: 'Mother',
      age: 68,
      gender: 'Female',
      condition: 'Bilateral Knee Osteoarthritis, Mild Osteopenia',
      location: 'Guntur, Andhra Pradesh',
      primaryLanguage: 'Telugu, English',
      notes: 'Undergoing knee physical therapy. Uses walking stick for long walks. Needs morning sunlight and calcium intake.',
      isPrimary: false,
    };
  }

  family.patients = [father, mother];
  family.careRecipient = {
    name: father.name,
    relationship: father.relationship,
    age: father.age,
    condition: father.condition,
    location: father.location,
    primaryLanguage: father.primaryLanguage,
    notes: father.notes,
  };
  await family.save();
  console.log(`Updated family patients: 1) ${father.name} (${father._id}), 2) ${mother.name} (${mother._id})`);

  // 6. Reset tasks, appointments, prescriptions for clean presentation state
  await CareTask.deleteMany({ familyId: family._id });
  await Appointment.deleteMany({ familyId: family._id });
  await Prescription.deleteMany({ familyId: family._id });
  await Activity.collection.deleteMany({ familyId: family._id });
  await CareSummary.deleteMany({ familyId: family._id });
  await CareChatMessage.deleteMany({ familyId: family._id });

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // --- SEED TASKS ---
  // Venkateswara Rao tasks: 2 completed, 1 in-progress, 1 overdue, 1 pending
  const fatherTasks = [
    {
      title: 'Collect discharge summary from Guntur hospital',
      description: 'Collect official discharge summary and scan into family documents folder.',
      category: 'document',
      priority: 'high',
      status: 'completed',
      assignedTo: users.arjun._id,
      createdBy: users.riya._id,
      patientId: father._id,
      patientName: father.name,
      dueDate: new Date(now.getTime() - 8 * dayMs),
      completedAt: new Date(now.getTime() - 7 * dayMs),
      completionNote: 'Discharge summary scanned and uploaded to family records folder.',
      createdAt: new Date(now.getTime() - 10 * dayMs),
    },
    {
      title: 'Refill Metformin 500mg & Telmisartan prescription',
      description: 'Monthly prescription refill from Apollo Pharmacy.',
      category: 'medication',
      priority: 'high',
      status: 'completed',
      assignedTo: users.priya._id,
      createdBy: users.riya._id,
      patientId: father._id,
      patientName: father.name,
      dueDate: new Date(now.getTime() - 5 * dayMs),
      completedAt: new Date(now.getTime() - 4 * dayMs),
      completionNote: 'Refill collected from Apollo Pharmacy, Guntur. Kept in Dad medication tray.',
      createdAt: new Date(now.getTime() - 8 * dayMs),
    },
    {
      title: 'Submit cardiology discharge insurance claim',
      description: 'Submit hospital invoices, doctor prescription, and claim form on the Star Health portal.',
      category: 'document',
      priority: 'urgent',
      status: 'pending',
      assignedTo: users.riya._id,
      createdBy: users.riya._id,
      patientId: father._id,
      patientName: father.name,
      dueDate: new Date(now.getTime() - 2 * dayMs), // OVERDUE
      createdAt: new Date(now.getTime() - 5 * dayMs),
    },
    {
      title: 'Book cab for cardiology consultation',
      description: 'Arrange comfortable AC cab for visit to Guntur Heart Centre with Arjun.',
      category: 'transport',
      priority: 'medium',
      status: 'in-progress',
      assignedTo: users.arjun._id,
      createdBy: users.riya._id,
      patientId: father._id,
      patientName: father.name,
      dueDate: new Date(now.getTime() + 3 * dayMs),
      createdAt: new Date(now.getTime() - 2 * dayMs),
    },
    {
      title: 'Daily blood pressure & fasting sugar logging',
      description: 'Record morning BP reading and fasting sugar before breakfast.',
      category: 'medication',
      priority: 'medium',
      status: 'pending',
      assignedTo: users.priya._id,
      createdBy: users.riya._id,
      patientId: father._id,
      patientName: father.name,
      dueDate: new Date(now.getTime() + 1 * dayMs),
      createdAt: new Date(now.getTime() - 1 * dayMs),
    },
  ];

  // Kamala Rao tasks: 2 completed, 2 pending
  const motherTasks = [
    {
      title: 'Purchase ergonomic knee brace & hot/cold gel pack',
      description: 'Buy breathable compression knee support as recommended by Dr. Radhika.',
      category: 'medication',
      priority: 'high',
      status: 'completed',
      assignedTo: users.priya._id,
      createdBy: users.riya._id,
      patientId: mother._id,
      patientName: mother.name,
      dueDate: new Date(now.getTime() - 4 * dayMs),
      completedAt: new Date(now.getTime() - 3 * dayMs),
      completionNote: 'Purchased knee support brace from MedPlus. Mom fitted it and feels comfortable.',
      createdAt: new Date(now.getTime() - 6 * dayMs),
    },
    {
      title: 'Collect bilateral knee X-ray films from Apollo Diagnostic',
      description: 'Pick up physical X-ray films and radiologist report for Friday consultation.',
      category: 'document',
      priority: 'high',
      status: 'completed',
      assignedTo: users.priya._id,
      createdBy: users.arjun._id,
      patientId: mother._id,
      patientName: mother.name,
      dueDate: new Date(now.getTime() - 2 * dayMs),
      completedAt: new Date(now.getTime() - 1 * dayMs),
      completionNote: 'X-ray films collected and kept in mother orthopedic file.',
      createdAt: new Date(now.getTime() - 4 * dayMs),
    },
    {
      title: 'Book Physiotherapy session for knee rehabilitation',
      description: 'Schedule a licensed home physiotherapist for knee mobility & quad strengthening.',
      category: 'appointment',
      priority: 'high',
      status: 'pending',
      assignedTo: users.arjun._id,
      createdBy: users.riya._id,
      patientId: mother._id,
      patientName: mother.name,
      dueDate: new Date(now.getTime() + 1 * dayMs),
      createdAt: new Date(now.getTime() - 2 * dayMs),
    },
    {
      title: 'Order monthly Calcium & Vitamin D3 supplements',
      description: 'Order Shelcal 500 and Vitamin D3 chewable tablets on Tata 1mg.',
      category: 'medication',
      priority: 'medium',
      status: 'pending',
      assignedTo: users.riya._id,
      createdBy: users.riya._id,
      patientId: mother._id,
      patientName: mother.name,
      dueDate: new Date(now.getTime() + 5 * dayMs),
      createdAt: new Date(now.getTime() - 1 * dayMs),
    },
  ];

  const allTasks = [...fatherTasks, ...motherTasks];
  const savedTasks = [];
  for (const t of allTasks) {
    const task = await CareTask.create({ ...t, familyId: family._id });
    savedTasks.push(task);
  }
  console.log(`Seeded ${savedTasks.length} tasks across both patients.`);

  // --- SEED APPOINTMENTS ---
  const appointmentsData = [
    // Venkateswara Rao
    {
      title: 'Cardiology follow-up & 2D Echo',
      doctorName: 'Dr. Suresh Reddy',
      clinic: 'Guntur Heart Centre',
      specialty: 'Cardiology',
      location: 'Opp. Collectorate, Guntur',
      dateTime: new Date(now.getTime() + 4 * dayMs + 3 * 60 * 60 * 1000), // in 4 days at 10:30am
      status: 'scheduled',
      assignedTo: users.arjun._id,
      createdBy: users.riya._id,
      patientId: father._id,
      patientName: father.name,
      notes: 'Follow-up for post-angioplasty review. Carry last month ECG & blood panel reports.',
      createdAt: new Date(now.getTime() - 6 * dayMs),
    },
    {
      title: 'Fasting Blood Sugar & HbA1c Lab Test',
      doctorName: 'Dr. R. Venkat (Pathologist)',
      clinic: 'Sri Lab Diagnostics',
      specialty: 'Pathology',
      location: 'Brodipet, Guntur',
      dateTime: new Date(now.getTime() - 9 * dayMs),
      status: 'completed',
      assignedTo: users.priya._id,
      createdBy: users.riya._id,
      patientId: father._id,
      patientName: father.name,
      notes: 'Fasting 12 hours required before blood draw. HbA1c came out at 6.8%.',
      createdAt: new Date(now.getTime() - 12 * dayMs),
    },
    // Kamala Rao
    {
      title: 'Orthopedic consultation & Knee mobility evaluation',
      doctorName: 'Dr. Radhika Sharma',
      clinic: 'Apollo Clinic',
      specialty: 'Orthopedics',
      location: 'Lakshmipuram, Guntur',
      dateTime: new Date(now.getTime() + 2 * dayMs + 5 * 60 * 60 * 1000), // in 2 days
      status: 'scheduled',
      assignedTo: users.priya._id,
      createdBy: users.riya._id,
      patientId: mother._id,
      patientName: mother.name,
      notes: 'Review knee joint pain and X-ray results. Discuss physiotherapy roadmap.',
      createdAt: new Date(now.getTime() - 4 * dayMs),
    },
    {
      title: 'Bilateral Knee Digital X-Ray',
      doctorName: 'Dr. K. Srinivas (Radiology)',
      clinic: 'Apollo Diagnostic Centre',
      specialty: 'Radiology',
      location: 'Lakshmipuram, Guntur',
      dateTime: new Date(now.getTime() - 3 * dayMs),
      status: 'completed',
      assignedTo: users.priya._id,
      createdBy: users.arjun._id,
      patientId: mother._id,
      patientName: mother.name,
      notes: 'Weight-bearing AP and lateral views taken. Mild joint space reduction noted.',
      createdAt: new Date(now.getTime() - 6 * dayMs),
    },
  ];

  const savedAppointments = [];
  for (const a of appointmentsData) {
    const appt = await Appointment.create({ ...a, familyId: family._id });
    savedAppointments.push(appt);
  }
  console.log(`Seeded ${savedAppointments.length} appointments across both patients.`);

  // --- SEED PRESCRIPTIONS ---
  const prescriptionsData = [
    // Venkateswara Rao
    {
      medicationName: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily with meals (Breakfast & Dinner)',
      prescribedBy: 'Dr. Suresh Reddy',
      startDate: new Date(now.getTime() - 90 * dayMs),
      notes: 'For blood sugar management. Regular HbA1c monitoring every 3 months.',
      patientId: father._id,
      patientName: father.name,
      status: 'active',
      createdBy: users.riya._id,
    },
    {
      medicationName: 'Telmisartan',
      dosage: '40mg',
      frequency: 'Once daily morning after breakfast',
      prescribedBy: 'Dr. Suresh Reddy',
      startDate: new Date(now.getTime() - 60 * dayMs),
      notes: 'For blood pressure control. Maintain systolic below 130 mmHg.',
      patientId: father._id,
      patientName: father.name,
      status: 'active',
      createdBy: users.riya._id,
    },
    {
      medicationName: 'Atorvastatin',
      dosage: '10mg',
      frequency: 'Once daily at bedtime',
      prescribedBy: 'Dr. Suresh Reddy',
      startDate: new Date(now.getTime() - 60 * dayMs),
      notes: 'Cardiovascular lipid control.',
      patientId: father._id,
      patientName: father.name,
      status: 'active',
      createdBy: users.riya._id,
    },
    // Kamala Rao
    {
      medicationName: 'Shelcal 500 (Calcium + Vit D3)',
      dosage: '500mg / 250 IU',
      frequency: 'Once daily after lunch',
      prescribedBy: 'Dr. Radhika Sharma',
      startDate: new Date(now.getTime() - 30 * dayMs),
      notes: 'Supports bone mineral density and joint cartilage.',
      patientId: mother._id,
      patientName: mother.name,
      status: 'active',
      createdBy: users.riya._id,
    },
    {
      medicationName: 'Glucosamine Sulfate',
      dosage: '750mg',
      frequency: 'Twice daily with meals',
      prescribedBy: 'Dr. Radhika Sharma',
      startDate: new Date(now.getTime() - 20 * dayMs),
      notes: 'Joint pain relief and osteo-care support.',
      patientId: mother._id,
      patientName: mother.name,
      status: 'active',
      createdBy: users.riya._id,
    },
    {
      medicationName: 'Paracetamol 650mg (SOS)',
      dosage: '650mg',
      frequency: 'As needed for acute knee pain (max 2/day)',
      prescribedBy: 'Dr. Radhika Sharma',
      startDate: new Date(now.getTime() - 14 * dayMs),
      notes: 'Only when knee joint pain flares up after walking.',
      patientId: mother._id,
      patientName: mother.name,
      status: 'active',
      createdBy: users.riya._id,
    },
  ];

  for (const p of prescriptionsData) {
    await Prescription.create({ ...p, familyId: family._id });
  }
  console.log(`Seeded ${prescriptionsData.length} prescriptions.`);

  // --- SEED ACTIVITIES ---
  const activitiesData = [
    {
      actorId: users.priya._id,
      actorName: users.priya.name,
      entityType: 'task',
      entityId: savedTasks[1]._id,
      entityTitle: savedTasks[1].title,
      action: 'completed',
      meta: {
        completionNote: 'Refill collected from Apollo Pharmacy, Guntur.',
        patientId: father._id,
        patientName: father.name,
      },
      createdAt: new Date(now.getTime() - 4 * dayMs),
    },
    {
      actorId: users.priya._id,
      actorName: users.priya.name,
      entityType: 'task',
      entityId: savedTasks[5]._id,
      entityTitle: savedTasks[5].title,
      action: 'completed',
      meta: {
        completionNote: 'Purchased knee support brace from MedPlus.',
        patientId: mother._id,
        patientName: mother.name,
      },
      createdAt: new Date(now.getTime() - 3 * dayMs),
    },
    {
      actorId: users.priya._id,
      actorName: users.priya.name,
      entityType: 'appointment',
      entityId: savedAppointments[3]._id,
      entityTitle: savedAppointments[3].title,
      action: 'status_changed',
      meta: {
        from: 'scheduled',
        to: 'completed',
        patientId: mother._id,
        patientName: mother.name,
      },
      createdAt: new Date(now.getTime() - 3 * dayMs + 2 * 60 * 60 * 1000),
    },
    {
      actorId: users.riya._id,
      actorName: users.riya.name,
      entityType: 'task',
      entityId: savedTasks[7]._id,
      entityTitle: savedTasks[7].title,
      action: 'created',
      meta: {
        patientId: mother._id,
        patientName: mother.name,
      },
      createdAt: new Date(now.getTime() - 2 * dayMs),
    },
    {
      actorId: users.priya._id,
      actorName: users.priya.name,
      entityType: 'task',
      entityId: savedTasks[6]._id,
      entityTitle: savedTasks[6].title,
      action: 'completed',
      meta: {
        completionNote: 'X-ray films collected and kept in mother orthopedic file.',
        patientId: mother._id,
        patientName: mother.name,
      },
      createdAt: new Date(now.getTime() - 1 * dayMs),
    },
    {
      actorId: users.arjun._id,
      actorName: users.arjun.name,
      entityType: 'task',
      entityId: savedTasks[3]._id,
      entityTitle: savedTasks[3].title,
      action: 'status_changed',
      meta: {
        from: 'pending',
        to: 'in-progress',
        patientId: father._id,
        patientName: father.name,
      },
      createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
    },
    {
      actorId: users.riya._id,
      actorName: users.riya.name,
      entityType: 'appointment',
      entityId: savedAppointments[2]._id,
      entityTitle: savedAppointments[2].title,
      action: 'created',
      meta: {
        patientId: mother._id,
        patientName: mother.name,
      },
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },
  ];

  for (const a of activitiesData) {
    await Activity.create({ ...a, familyId: family._id });
  }
  console.log(`Seeded ${activitiesData.length} activity feed items.`);

  // --- SEED CARE SUMMARIES ---
  // 1. Overall Family Summary
  await CareSummary.create({
    familyId: family._id,
    requestedBy: users.riya._id,
    patientId: null,
    patientName: 'All Family Members',
    periodStart: new Date(now.getTime() - 7 * dayMs),
    periodEnd: now,
    status: 'ready',
    content: {
      recentlyCompleted: [
        { text: 'Refill Metformin 500mg & Telmisartan prescription completed by Priya Rao for Venkateswara Rao.' },
        { text: 'Purchased ergonomic knee brace & hot/cold gel pack completed by Priya Rao for Kamala Rao.' },
        { text: 'Bilateral knee X-ray films collected from Apollo Diagnostic by Priya Rao.' },
      ],
      pending: [
        { text: 'Submit cardiology discharge insurance claim is pending (urgent priority, assigned to Riya Rao).' },
        { text: 'Book cab for cardiology consultation is in progress (assigned to Arjun Rao).' },
        { text: 'Book Physiotherapy session for knee rehabilitation is pending (assigned to Arjun Rao).' },
      ],
      overdue: [
        { text: 'Submit cardiology discharge insurance claim is 2 days overdue (assigned to Riya Rao).' },
      ],
      upcomingAppointments: [
        { text: 'Orthopedic consultation with Dr. Radhika Sharma at Apollo Clinic (Kamala Rao, this Friday).' },
        { text: 'Cardiology follow-up & 2D Echo with Dr. Suresh Reddy at Guntur Heart Centre (Venkateswara Rao, next Tuesday).' },
      ],
      suggestedAdminActions: [
        { text: 'Prioritize submitting the Star Health cardiology discharge claim today to prevent claim processing delays.' },
        { text: 'Coordinate with Arjun Rao to confirm cab pickup 2 hours ahead of Venkateswara Rao cardiology appointment.' },
      ],
    },
  });

  // 2. Summary specifically for Father
  await CareSummary.create({
    familyId: family._id,
    requestedBy: users.riya._id,
    patientId: father._id,
    patientName: father.name,
    periodStart: new Date(now.getTime() - 7 * dayMs),
    periodEnd: now,
    status: 'ready',
    content: {
      recentlyCompleted: [
        { text: 'Refill Metformin 500mg & Telmisartan completed by Priya Rao at Apollo Pharmacy.' },
        { text: 'Hospital discharge summary scanned and archived in family documents by Arjun Rao.' },
      ],
      pending: [
        { text: 'Submit cardiology discharge insurance claim (urgent, Riya Rao).' },
        { text: 'Book cab for cardiology consultation (Arjun Rao).' },
      ],
      overdue: [
        { text: 'Submit cardiology discharge insurance claim is 2 days overdue.' },
      ],
      upcomingAppointments: [
        { text: 'Cardiology follow-up & 2D Echo with Dr. Suresh Reddy (next Tuesday, 10:30 AM).' },
      ],
      suggestedAdminActions: [
        { text: 'Submit the hospital bill and discharge summary to the insurance portal.' },
      ],
    },
  });

  // 3. Summary specifically for Mother
  await CareSummary.create({
    familyId: family._id,
    requestedBy: users.riya._id,
    patientId: mother._id,
    patientName: mother.name,
    periodStart: new Date(now.getTime() - 7 * dayMs),
    periodEnd: now,
    status: 'ready',
    content: {
      recentlyCompleted: [
        { text: 'Purchased ergonomic knee support brace & hot/cold gel pack (Priya Rao).' },
        { text: 'Collected bilateral knee digital X-ray films from Apollo Diagnostic (Priya Rao).' },
      ],
      pending: [
        { text: 'Book Physiotherapy session for knee mobility & quad strengthening (Arjun Rao).' },
        { text: 'Order monthly Calcium & Vitamin D3 supplements (Riya Rao).' },
      ],
      overdue: [],
      upcomingAppointments: [
        { text: 'Orthopedic consultation with Dr. Radhika Sharma at Apollo Clinic (this Friday, 11:00 AM).' },
      ],
      suggestedAdminActions: [
        { text: 'Ensure physical X-ray films are kept in Priya bag before leaving for the clinic on Friday.' },
      ],
    },
  });
  console.log('Seeded 3 scoped AI Care Summaries.');

  // --- SEED CARE CHAT MESSAGES ---
  const demoMessages = [
    {
      familyId: family._id,
      sender: users.arjun._id,
      senderName: users.arjun.name,
      role: 'user',
      message: 'What tasks are overdue for Dad this week?',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      familyId: family._id,
      sender: users.riya._id,
      senderName: 'Care Assistant',
      role: 'assistant',
      message:
        'Here is the overdue task requiring attention for **Venkateswara Rao**:\n\n• **Submit cardiology discharge insurance claim**\n  - Priority: Urgent\n  - Assigned to: Riya Rao\n  - Due date: 2 days ago\n\nPlease remind Riya to upload the hospital bill and discharge papers to the Star Health portal.',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 15000),
    },
    {
      familyId: family._id,
      sender: users.priya._id,
      senderName: users.priya.name,
      role: 'user',
      message: 'When is Mom next orthopedic visit and what do we need to take?',
      createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
    },
    {
      familyId: family._id,
      sender: users.riya._id,
      senderName: 'Care Assistant',
      role: 'assistant',
      message:
        'Here are the details for **Kamala Rao**:\n\n• **Appointment:** Orthopedic consultation & Knee mobility evaluation\n• **Doctor:** Dr. Radhika Sharma (Apollo Clinic, Lakshmipuram, Guntur)\n• **Schedule:** This Friday at 11:00 AM\n• **Accompanied by:** Priya Rao\n\n**Items to carry:**\n1. Bilateral knee digital X-ray films (collected by Priya yesterday)\n2. Current medication list (Shelcal 500, Glucosamine Sulfate)\n3. Comfortable loose trousers for mobility assessment',
      createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000 + 18000),
    },
  ];

  for (const m of demoMessages) {
    await CareChatMessage.create(m);
  }
  console.log(`Seeded ${demoMessages.length} Care Assistant chat messages.`);

  console.log('\n=== EXPO SEED COMPLETED SUCCESSFULLY ===');
  console.log('Login credentials for recording:');
  console.log('  Admin:   riya.rao@carerelay.demo  / Demo@1234');
  console.log('  Brother: arjun.rao@carerelay.demo / Demo@1234');
  console.log('  Sister:  priya.rao@carerelay.demo / Demo@1234');
  console.log('Patients:');
  console.log(`  1. ${father.name} (Father, 72, Cardiology & Diabetes)`);
  console.log(`  2. ${mother.name} (Mother, 68, Knee Osteoarthritis)`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
