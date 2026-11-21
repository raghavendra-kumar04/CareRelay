# CareRelay — Product Requirements Document

> **Version:** 1.0 | **Date:** 2026-11-21 | **Hackathon:** ACE Builder — Problem Statement 4  
> **Status:** Implementation-Ready Draft  
> **Tagline:** *Care doesn't stop when families live apart.*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision and Goals](#3-product-vision-and-goals)
4. [Target Users and Personas](#4-target-users-and-personas)
5. [User Problems and Use Cases](#5-user-problems-and-use-cases)
6. [Product Differentiation](#6-product-differentiation)
7. [Functional Requirements](#7-functional-requirements)
8. [User Journeys](#8-user-journeys)
9. [UI/UX and Navigation Specification](#9-uiux-and-navigation-specification)
10. [System Architecture](#10-system-architecture)
11. [Database Schema](#11-database-schema)
12. [API Specifications](#12-api-specifications)
13. [Real-Time Communication Architecture](#13-real-time-communication-architecture)
14. [AI Summary Architecture](#14-ai-summary-architecture)
15. [Security and Privacy](#15-security-and-privacy)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [MVP Scope and Priorities](#17-mvp-scope-and-priorities)
18. [Implementation Roadmap](#18-implementation-roadmap)
19. [Testing and Acceptance Criteria](#19-testing-and-acceptance-criteria)
20. [Hackathon Demonstration Flow](#20-hackathon-demonstration-flow)
21. [Risks and Mitigation](#21-risks-and-mitigation)
22. [Scalability and Future Opportunities](#22-scalability-and-future-opportunities)
23. [Additional Recommendations](#23-additional-recommendations)
24. [Environment Variables and Setup Requirements](#24-environment-variables-and-setup-requirements)

---

## 1. Executive Summary

CareRelay is a web-based family care coordination platform that solves the fragmented communication and accountability gap experienced by adult children who jointly manage the care of an elderly parent from different cities.

**Core value proposition:** Every care activity has an owner, a status and a shared record — visible to the whole family in real time.

**Technology:** MERN stack + Socket.IO + Gemini API.  
**Target demo:** Three-person synthetic family coordinating care for one elderly parent.  
**Delivery:** Solo developer, AI-assisted, hackathon timeline.

**Critical pre-implementation decisions made in this document:**

| Decision | Choice | Rationale |
|---|---|---|
| Real-time library | Socket.IO (rooms per family) | Fits MERN, well-documented |
| AI integration | Gemini API via backend only | Single API key, no client exposure |
| Auth mechanism | JWT (access + refresh tokens) | Stateless, suits REST + Socket.IO |
| File storage | MongoDB GridFS (P1) → defer to URL references in P0 | No S3 cost or config in P0 |
| Notifications | In-app via Socket.IO (P0); email via Nodemailer (P1) | No paid service in P0 |
| Prescription tracking | Stored as structured fields, not clinical records | Keeps product non-medical |
| AI triggers | User-triggered only (not automatic) | Avoids runaway API costs |

---

## 2. Problem Statement

### Context

Millions of Indian families have elderly parents living in one city while adult children are distributed across metro cities. Care decisions happen across phone calls, WhatsApp groups, paper prescriptions and individual calendars.

### Specific Failure Modes

| Failure | Impact |
|---|---|
| No shared task ownership | Appointments missed; "I thought you handled it" |
| Information silos | Each family member has an incomplete picture |
| No activity history | Cannot recall what was done or when |
| No reminder coordination | Medicine refills missed; follow-ups skipped |
| No overdue visibility | Gaps only discovered after something goes wrong |
| No aggregated update mechanism | Family calls needed just to sync status |

### What CareRelay Does Not Do

- Diagnose medical conditions.
- Recommend medication or dosage changes.
- Replace doctors or medical professionals.
- Store sensitive identity documents (Aadhaar, insurance).
- Claim regulatory compliance (HIPAA, DPDPA).

---

## 3. Product Vision and Goals

### Vision

A calm, trusted operating system for distributed family caregiving — where every task has an owner, every update is visible, and no family member is left out of the loop.

### Hackathon Goals (Measurable)

| Goal | Success Metric |
|---|---|
| Core coordination loop working | Task create → assign → complete → timeline visible to all |
| Real-time sync demonstrated | Two browser sessions show update <1 s apart |
| AI summary functional | Generates structured summary from seed data in <10 s |
| Family snapshot readable | Dashboard answers all 5 key questions without scrolling |
| Auth and isolation verified | Family A cannot see Family B data |

---

## 4. Target Users and Personas

### Persona A — The Primary Coordinator (Riya, 34, Bangalore)

- Manages doctor appointments, hospital visits.
- Technically comfortable; uses apps daily.
- Pain: spends 2 hours a week on WhatsApp coordination calls.
- Need: single source of truth; know what her siblings have done.

### Persona B — The Logistics Member (Arjun, 31, Hyderabad)

- Handles medicine procurement and refills.
- Busy; needs reminders and simple task views.
- Pain: forgets follow-up dates; unaware of what his sister handled.
- Need: clear task list with due dates; know what is overdue.

### Persona C — The Remote Observer (Priya, 28, Pune)

- Cannot travel often; contributes by tracking and coordinating.
- Need: visibility into what is happening without being active actor.
- Pain: discovers problems after calls, not before.

### Care Recipient — Venkateswara Rao (72, Guntur)

- Not a platform user. Care is managed on his behalf.
- Has diabetes, hypertension (synthetic conditions for demo).

> **Note:** All personas and care records above are **synthetic** and used exclusively for demonstration.

---

## 5. User Problems and Use Cases

### Primary Use Cases

| ID | Actor | Use Case |
|---|---|---|
| UC-01 | Coordinator | Create a care task and assign it to a family member |
| UC-02 | Member | View all tasks assigned to me |
| UC-03 | Any member | See what is overdue and who owns it |
| UC-04 | Any member | See upcoming appointments in the next 7 days |
| UC-05 | Any member | View the complete activity timeline in chronological order |
| UC-06 | Coordinator | Mark a task complete and add a note |
| UC-07 | Any member | Request an AI-generated family care summary |
| UC-08 | Coordinator | Invite a new family member to the workspace |
| UC-09 | Any member | Receive real-time updates when another member acts |
| UC-10 | Coordinator | Create and track an appointment |
| UC-11 | Member | Record a medicine refill event |
| UC-12 | Any member | Reassign a task to another member |

---

## 6. Product Differentiation

CareRelay is **not** a medical records app, a task manager or a messaging app. It is specifically designed for the distributed family caregiving context.

### Differentiating Principles

| Principle | Implementation |
|---|---|
| **Responsibility-first** | Every task has exactly one assigned owner at all times |
| **Real-time family sync** | Socket.IO propagates changes to all family members instantly |
| **AI-narrated updates** | Gemini converts activity records into plain-language family briefings |
| **10-Second Snapshot** | Dashboard designed to answer the 5 care questions in one screen |
| **Care continuity** | Completion history is immutable; all actions are audited |
| **Calm design** | No alarm aesthetics; professional and trustworthy |

### Suggested Additional Differentiators (Evaluated)

| Feature | Problem Solved | Value | Complexity | Priority |
|---|---|---|---|---|
| **Care Notes per task** | Context lost when tasks transferred | High | Low — text field on task | P0 |
| **Activity feed with actor names** | Family doesn't know who did what | High | Low — derived from activity log | P0 |
| **"Handoff" task action** | Reassignment needs context | Medium | Low — adds a note on reassign | P1 |
| **Urgency flag on tasks** | Priority not visible at a glance | Medium | Low — existing priority field | P0 |
| **Last-updated timestamp on snapshot** | Trust in freshness of data | High | Trivial | P0 |

---

## 7. Functional Requirements

### A. Authentication and Family Workspace

| Req | Specification |
|---|---|
| A-01 | Email + password registration. Password hashed with bcrypt (12 rounds). |
| A-02 | JWT access token (15 min expiry) + refresh token (7 days) stored in httpOnly cookie. |
| A-03 | Login returns access token in response body; refresh token set as httpOnly cookie. |
| A-04 | POST /auth/refresh renews access token using valid refresh cookie. |
| A-05 | A user can create a named family workspace (e.g., "Rao Family Care"). |
| A-06 | Workspace creator automatically becomes `admin`. |
| A-07 | Admin can invite members via email (generates invite token; P0: shareable link). |
| A-08 | Invited user accepts invite, creates account if new, joins workspace. |
| A-09 | Roles: `admin` (full access), `member` (read + create tasks/appointments; cannot delete others' records). |
| A-10 | Data model supports one user belonging to multiple workspaces (future-ready). |
| A-11 | Logout invalidates refresh token (server-side blocklist in Redis or MongoDB). |

> **Implementation note on A-11:** Use a `RefreshTokens` MongoDB collection (token hash + expiry) rather than Redis to avoid an additional service dependency in P0.

### B. Shared Care Records and Timeline

| Req | Specification |
|---|---|
| B-01 | Activity records are auto-created whenever a task or appointment changes state. |
| B-02 | Each activity record contains: `actorId`, `actorName`, `familyId`, `entityType` (task/appointment), `entityId`, `action`, `note`, `timestamp`. |
| B-03 | Timeline view shows all activities for the family, sorted descending by timestamp. |
| B-04 | Timeline is filterable by: entity type, actor, date range. |
| B-05 | Appointment records store: doctor name, clinic/hospital, specialty, date/time, location, notes, status, assignedTo, attachmentUrls (empty array in P0). |
| B-06 | Prescription records store: medication name, dosage (text field), frequency (text), prescribedBy, startDate, refillDate, notes. No clinical interpretation. |
| B-07 | Timeline entries display actor avatar/initials, action description, entity name, timestamp (relative + absolute). |

### C. Task Management and Responsibility Tracking

| Req | Specification |
|---|---|
| C-01 | Task fields: `title`, `description`, `category` (enum), `assignedTo`, `createdBy`, `dueDate`, `priority` (low/medium/high/urgent), `status` (pending/in-progress/completed), `notes[]`, `familyId`. |
| C-02 | Category enum: `appointment`, `medication`, `document`, `transport`, `communication`, `other`. |
| C-03 | Task creation emits `task:created` Socket.IO event to family room. |
| C-04 | Status transitions: `pending → in-progress → completed`. Completed tasks are immutable except for admin. |
| C-05 | Completion requires a mandatory completion note (minimum 5 characters). |
| C-06 | Reassignment creates an activity log entry and emits `task:updated`. |
| C-07 | Overdue = `status !== 'completed'` AND `dueDate < now()`. Computed on query, not stored. |
| C-08 | Tasks list supports filter by: status, assignedTo, priority, overdue, category. |
| C-09 | Admin can delete tasks (soft-delete via `deletedAt` field). Members cannot delete tasks. |

### D. Appointment and Refill Tracking

| Req | Specification |
|---|---|
| D-01 | Appointments are separate from tasks but can be linked (`relatedTaskId`). |
| D-02 | Appointment statuses: `scheduled`, `completed`, `cancelled`, `rescheduled`. |
| D-03 | Upcoming appointments: `status = scheduled` AND `dateTime > now()`, sorted ascending. |
| D-04 | Refill records linked to prescription records; refill due date triggers overdue flag. |
| D-05 | In-app reminder: 24 hours before appointment, emit reminder event to assigned member's socket session. P1: email via Nodemailer. |
| D-06 | A cron job (node-cron) runs hourly to identify upcoming appointment reminders and emit socket events to online members; records reminder in activity log regardless of online status. |

### E. Real-Time Family Synchronisation

Covered in full in [Section 13](#13-real-time-communication-architecture).

### F. AI-Generated Care Summaries

Covered in full in [Section 14](#14-ai-summary-architecture).

---

## 8. User Journeys

### Journey 1: First-Time Setup

```
Register → Create family workspace → Copy invite link → 
Share with siblings → Siblings register/join → Dashboard visible to all
```

### Journey 2: Task Coordination Loop

```
Riya creates "Book cardiology appointment" task → 
Assigns to Arjun, due Friday, priority: high →
Arjun receives real-time notification →
Arjun updates status to in-progress →
Arjun completes task with note "Booked for Saturday 10am, Dr. Reddy" →
Riya and Priya see activity feed update instantly →
Dashboard overdue count decrements
```

### Journey 3: AI Summary Request

```
Priya clicks "Generate Family Update" →
Loading state shown →
Backend fetches last 7 days of activities →
Sends to Gemini with structured prompt →
Structured summary returned and stored →
Summary displayed with reporting period + generation timestamp →
"View source records" link shows underlying activities
```

### Journey 4: New Family Member Joins

```
Admin copies invite link →
New member opens link →
If registered: auto-joins workspace →
If new: shown registration form with family name pre-filled →
After joining: sees existing dashboard, timeline, tasks
```

---

## 9. UI/UX and Navigation Specification

### Visual Design System

| Token | Value |
|---|---|
| Background | `#FAFAF8` (warm off-white) |
| Surface | `#FFFFFF` |
| Primary accent | `#5C8A6E` (sage green) |
| Primary dark | `#3D6B52` |
| Text primary | `#1C2B2B` (charcoal) |
| Text secondary | `#6B7B7A` |
| Border | `#E5E9E6` |
| Error | `#C0392B` |
| Warning | `#D4830A` |
| Success | `#2E7D52` |
| Font | Inter (Google Fonts, free) |
| Border radius | `8px` cards, `6px` inputs, `50px` pills |
| Shadow | `0 1px 4px rgba(0,0,0,0.08)` |

### Navigation Structure

```
Top nav bar (desktop) / Bottom tab bar (mobile)
├── Dashboard (snapshot)
├── Tasks
├── Appointments
├── Timeline
├── AI Summary
└── Settings (admin-gated sections)
```

### Page Hierarchy

| Route | Component | Auth | Description |
|---|---|---|---|
| `/` | Landing | Public | Product intro + login/register CTA |
| `/login` | LoginPage | Public | Email + password |
| `/register` | RegisterPage | Public | Email, name, password |
| `/invite/:token` | InvitePage | Public | Join workspace flow |
| `/dashboard` | DashboardPage | Auth | Family Snapshot |
| `/tasks` | TasksPage | Auth | Full task list with filters |
| `/tasks/:id` | TaskDetailPage | Auth | Single task detail + notes + history |
| `/appointments` | AppointmentsPage | Auth | Appointment list + create |
| `/appointments/:id` | AppointmentDetail | Auth | Single appointment |
| `/timeline` | TimelinePage | Auth | Chronological activity feed |
| `/summary` | SummaryPage | Auth | AI summary + history |
| `/settings` | SettingsPage | Auth | Profile, family, members |
| `/settings/members` | MembersPage | Admin | Invite/manage members |

### Family Snapshot Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ CareRelay           [Family: Rao Family Care]      [Riya ▾]     │
├──────────┬──────────┬──────────┬──────────────────────────────  │
│ ✓ Done   │ ⏳ Pending│ 🔴 Overdue│ 📅 Upcoming (next 7 days)     │
│   12     │    5     │    2     │   Dr. Reddy — Sat 10am         │
│          │          │          │   Blood test — Mon 8am         │
├──────────┴──────────┴──────────┴──────────────────────────────  │
│ OUTSTANDING RESPONSIBILITIES                                     │
│ • Arjun   — Insulin refill         Due Fri   [high]  [In Prog] │
│ • Riya    — Collect scan report    Due Today [urgent][Pending]  │
│ • Priya   — Call physiotherapist   Due Sun   [med]   [Pending]  │
├─────────────────────────────────────────────────────────────────│
│ RECENT ACTIVITY                        [AI Family Update →]     │
│ Riya completed "Book cardiology appt"  2 hours ago              │
│ Arjun updated "Insulin refill" → In Progress  5 hours ago      │
│ Priya added note to "Scan report"      Yesterday                │
└─────────────────────────────────────────────────────────────────┘
```

### UI States (Required for All Core Components)

| State | Implementation |
|---|---|
| **Loading** | Skeleton loaders (shadcn/ui Skeleton); no spinners blocking content |
| **Empty** | Illustrated empty state with contextual CTA ("Create your first task →") |
| **Error** | Inline error message + retry button; toast for transient errors |
| **Success** | Toast notification (shadcn/ui Toaster), 3 s auto-dismiss |
| **Real-time update** | Subtle slide-in animation on new activity items; green dot on nav icon |
| **Offline** | Banner: "Reconnecting…" when Socket.IO disconnects |
| **AI loading** | Animated placeholder text: "Generating family update…" with progress indicator |

### Key UI Components

| Component | Description |
|---|---|
| `TaskCard` | Title, assignee avatar, due date, priority badge, status badge, overdue highlight |
| `ActivityItem` | Actor initials circle, action text, entity chip, relative timestamp |
| `AppointmentCard` | Doctor, date, assigned member, status, days-until indicator |
| `SnapshotCounter` | Large number, label, colour-coded by state |
| `MemberAvatar` | Initials + colour; tooltip shows full name |
| `SummaryBlock` | Structured AI output with section headings, disclaimer footer |
| `RealTimeIndicator` | Small pulsing green dot indicating live connection |

---

## 10. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  React + Vite + TypeScript + Tailwind + shadcn/ui               │
│  React Query (server state) + Zustand (local/socket state)       │
│  Socket.IO client                                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │  HTTPS + WSS
┌──────────────────────▼──────────────────────────────────────────┐
│                      BACKEND (Node.js / Express)                │
│  REST API (Express Router)                                      │
│  Socket.IO Server (attached to HTTP server)                     │
│  JWT Middleware → Role Middleware → Route Handler               │
│  AI Summary Service (Gemini API — server-side only)             │
│  node-cron (hourly reminder job)                                │
└──────────┬────────────────────────────────┬─────────────────────┘
           │                                │
┌──────────▼──────────┐        ┌────────────▼──────────────────── ┐
│  MongoDB Atlas       │        │  Gemini API (Google AI Studio)   │
│  Mongoose ODM        │        │  gemini-1.5-flash (free tier)    │
└──────────────────────┘        └───────────────────────────────── ┘
```

### Backend Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js              # Mongoose connection
│   │   └── env.js             # Environment validation (Zod)
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   ├── requireRole.js     # Role-based guard
│   │   ├── validate.js        # Zod request validation
│   │   └── errorHandler.js    # Global error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Family.js
│   │   ├── Membership.js
│   │   ├── CareTask.js
│   │   ├── Appointment.js
│   │   ├── Prescription.js
│   │   ├── Activity.js
│   │   ├── CareSummary.js
│   │   └── RefreshToken.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── family.routes.js
│   │   ├── tasks.routes.js
│   │   ├── appointments.routes.js
│   │   ├── prescriptions.routes.js
│   │   ├── activities.routes.js
│   │   └── summary.routes.js
│   ├── controllers/           # One file per route module
│   ├── services/
│   │   ├── activityService.js # Creates Activity records
│   │   ├── socketService.js   # Emits Socket.IO events
│   │   └── aiService.js       # Gemini API integration
│   ├── socket/
│   │   └── socketServer.js    # Socket.IO init, auth, room management
│   ├── jobs/
│   │   └── reminderJob.js     # node-cron hourly job
│   └── app.js                 # Express app + Socket.IO bootstrap
├── .env
├── package.json
└── Dockerfile                 # For Render deployment
```

### Frontend Folder Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx  # Nav + outlet
│   │   │   └── Navbar.tsx
│   │   ├── tasks/
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── TaskFilters.tsx
│   │   ├── appointments/
│   │   ├── timeline/
│   │   │   └── ActivityItem.tsx
│   │   ├── dashboard/
│   │   │   ├── SnapshotCounters.tsx
│   │   │   ├── UpcomingPanel.tsx
│   │   │   ├── ResponsibilityPanel.tsx
│   │   │   └── RecentActivity.tsx
│   │   └── summary/
│   │       └── SummaryBlock.tsx
│   ├── pages/                 # One file per route
│   ├── hooks/
│   │   ├── useSocket.ts       # Socket.IO client setup
│   │   ├── useAuth.ts
│   │   ├── useTasks.ts
│   │   └── useFamily.ts
│   ├── store/
│   │   └── socketStore.ts     # Zustand: connection state + events
│   ├── lib/
│   │   ├── api.ts             # Axios instance + interceptors
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts           # Shared TypeScript interfaces
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 11. Database Schema

### Shared Conventions

- All documents include `createdAt` / `updatedAt` via Mongoose timestamps.
- `familyId` is indexed on every collection that is family-scoped.
- Soft deletes use `deletedAt: Date | null` (default null); queries always filter `deletedAt: null`.
- ObjectId references use Mongoose `ref` for population.

---

### Users

```js
{
  _id: ObjectId,
  name: String (required, trim, max 80),
  email: String (required, unique, lowercase),
  passwordHash: String (required),
  avatarColor: String (hex, assigned at registration),
  createdAt: Date,
  updatedAt: Date
}
Indexes: email (unique)
```

### Families

```js
{
  _id: ObjectId,
  name: String (required, trim, max 100),
  createdBy: ObjectId → User,
  inviteToken: String (uuid, unique),    // shareable join link
  inviteTokenExpiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
Indexes: inviteToken (sparse)
```

### Memberships

```js
{
  _id: ObjectId,
  familyId: ObjectId → Family (required),
  userId: ObjectId → User (required),
  role: String enum ['admin', 'member'] (required),
  joinedAt: Date,
  deletedAt: Date | null
}
Indexes: { familyId, userId } unique compound; { userId } for "my families" query
```

### CareTasks

```js
{
  _id: ObjectId,
  familyId: ObjectId → Family (required),
  title: String (required, trim, max 200),
  description: String (max 1000),
  category: String enum ['appointment','medication','document','transport','communication','other'],
  priority: String enum ['low','medium','high','urgent'] (default: 'medium'),
  status: String enum ['pending','in-progress','completed'] (default: 'pending'),
  assignedTo: ObjectId → User (required),
  createdBy: ObjectId → User (required),
  dueDate: Date,
  completedAt: Date,
  completionNote: String (required when status→completed, min 5 chars),
  notes: [{ author: ObjectId, text: String, createdAt: Date }],
  relatedAppointmentId: ObjectId → Appointment | null,
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
Indexes: { familyId, status }; { familyId, assignedTo }; { familyId, dueDate }; { familyId, deletedAt }
```

### Appointments

```js
{
  _id: ObjectId,
  familyId: ObjectId → Family (required),
  title: String (required, max 200),         // e.g. "Cardiology Follow-up"
  doctorName: String (max 100),
  clinic: String (max 150),
  specialty: String (max 80),
  dateTime: Date (required),
  location: String (max 200),
  assignedTo: ObjectId → User (required),
  createdBy: ObjectId → User,
  status: String enum ['scheduled','completed','cancelled','rescheduled'],
  notes: String (max 1000),
  relatedTaskId: ObjectId → CareTask | null,
  attachmentUrls: [String],                  // P1: populated via upload
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
Indexes: { familyId, dateTime }; { familyId, status }; { familyId, assignedTo }
```

### Prescriptions

```js
{
  _id: ObjectId,
  familyId: ObjectId → Family (required),
  medicationName: String (required, max 150),
  dosage: String (max 100),                  // text field only — not clinical
  frequency: String (max 100),               // "twice daily" — text only
  prescribedBy: String (max 100),
  startDate: Date,
  refillDueDate: Date,
  notes: String (max 500),
  createdBy: ObjectId → User,
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
Indexes: { familyId, refillDueDate }
```

### Activities

```js
{
  _id: ObjectId,
  familyId: ObjectId → Family (required),
  actorId: ObjectId → User (required),
  actorName: String (denormalised snapshot),
  entityType: String enum ['task','appointment','prescription','summary','member'],
  entityId: ObjectId,
  entityTitle: String (denormalised snapshot),
  action: String enum [
    'created','updated','completed','reassigned','cancelled',
    'rescheduled','noted','invited','joined','generated'
  ],
  meta: Object (freeform, e.g. { from: 'pending', to: 'in-progress' }),
  createdAt: Date
}
Indexes: { familyId, createdAt: -1 }; { familyId, actorId }; { familyId, entityType }
Note: Activities are immutable — no update or delete operations.
```

### CareSummaries

```js
{
  _id: ObjectId,
  familyId: ObjectId → Family (required),
  requestedBy: ObjectId → User,
  reportingPeriod: { start: Date, end: Date },
  generatedAt: Date,
  model: String (e.g. 'gemini-1.5-flash'),
  promptVersion: String (semver),
  content: {
    reportingPeriodLabel: String,
    recentlyCompleted: [String],
    pending: [String],
    overdue: [String],
    upcomingAppointments: [String],
    suggestedActions: [String],
    disclaimer: String
  },
  sourceActivityIds: [ObjectId → Activity],
  status: String enum ['generating','ready','failed'],
  errorMessage: String | null,
  createdAt: Date
}
Indexes: { familyId, createdAt: -1 }
```

### RefreshTokens

```js
{
  _id: ObjectId,
  tokenHash: String (sha256 of raw token, unique),
  userId: ObjectId → User,
  expiresAt: Date,
  createdAt: Date
}
Indexes: tokenHash (unique); expiresAt (TTL index — MongoDB auto-deletes expired)
```

---

## 12. API Specifications

### Base URL

- Dev: `http://localhost:5000/api`
- Prod: `https://carerelay-api.onrender.com/api`

### Standard Response Envelope

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "TASK_NOT_FOUND", "message": "Task not found" } }

// Paginated
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 47 } }
```

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/login` | None | Login, set refresh cookie |
| POST | `/auth/refresh` | Cookie | Refresh access token |
| POST | `/auth/logout` | Bearer | Invalidate refresh token |
| GET | `/auth/me` | Bearer | Current user profile |

**POST /auth/register**
```json
// Request
{ "name": "Riya Rao", "email": "riya@example.com", "password": "Min8Chars!" }

// Response 201
{ "success": true, "data": { "user": { "_id": "...", "name": "Riya Rao", "email": "..." }, "accessToken": "..." } }
```

**POST /auth/login**
```json
// Request
{ "email": "riya@example.com", "password": "Min8Chars!" }

// Response 200 — Set-Cookie: refreshToken=<token>; HttpOnly; SameSite=Strict; Secure
{ "success": true, "data": { "user": { ... }, "accessToken": "..." } }
```

### Family

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/families` | Bearer | — | Create family workspace |
| GET | `/families/mine` | Bearer | — | List user's family workspaces |
| GET | `/families/:id` | Bearer | Member | Get family details + members |
| PATCH | `/families/:id` | Bearer | Admin | Update family name |
| POST | `/families/:id/invite` | Bearer | Admin | Regenerate invite link |
| POST | `/families/join/:token` | Bearer | — | Join via invite token |
| GET | `/families/:id/members` | Bearer | Member | List members |
| DELETE | `/families/:id/members/:userId` | Bearer | Admin | Remove member |

### Tasks

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/families/:fid/tasks` | Member | List tasks (filters: status, assignedTo, priority, overdue, category) |
| POST | `/families/:fid/tasks` | Member | Create task |
| GET | `/families/:fid/tasks/:id` | Member | Get task detail |
| PATCH | `/families/:fid/tasks/:id` | Member | Update task (status, assignedTo, notes, etc.) |
| DELETE | `/families/:fid/tasks/:id` | Admin | Soft-delete task |

**POST /families/:fid/tasks — Request**
```json
{
  "title": "Book cardiology appointment",
  "description": "Annual follow-up with Dr. Reddy at KIMS",
  "category": "appointment",
  "assignedTo": "userId_arjun",
  "dueDate": "2026-11-28T00:00:00.000Z",
  "priority": "high"
}
```

**PATCH /families/:fid/tasks/:id — Complete Task**
```json
{
  "status": "completed",
  "completionNote": "Appointment booked for Saturday 10am, confirmed via phone."
}
```

**GET /families/:fid/tasks — Query Parameters**

| Param | Values | Default |
|---|---|---|
| `status` | pending, in-progress, completed | all |
| `assignedTo` | userId | all |
| `priority` | low, medium, high, urgent | all |
| `overdue` | true | — |
| `category` | enum value | all |
| `page` | number | 1 |
| `limit` | number | 20 |

### Appointments

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/families/:fid/appointments` | Member | List (filters: status, assignedTo, upcoming) |
| POST | `/families/:fid/appointments` | Member | Create appointment |
| PATCH | `/families/:fid/appointments/:id` | Member | Update appointment |
| DELETE | `/families/:fid/appointments/:id` | Admin | Soft-delete |

### Prescriptions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/families/:fid/prescriptions` | Member | List prescriptions |
| POST | `/families/:fid/prescriptions` | Member | Add prescription |
| PATCH | `/families/:fid/prescriptions/:id` | Member | Update |
| DELETE | `/families/:fid/prescriptions/:id` | Admin | Soft-delete |

### Activities (Timeline)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/families/:fid/activities` | Member | List activities (filters: entityType, actorId, startDate, endDate, page, limit) |

### Dashboard Snapshot

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/families/:fid/snapshot` | Member | Aggregated dashboard data |

**GET /families/:fid/snapshot — Response**
```json
{
  "success": true,
  "data": {
    "counts": { "completed": 12, "pending": 5, "overdue": 2 },
    "upcomingAppointments": [ { "_id": "...", "title": "...", "dateTime": "...", "assignedTo": { "name": "Arjun" } } ],
    "overdueItems": [ { "_id": "...", "title": "...", "dueDate": "...", "assignedTo": { "name": "Riya" } } ],
    "recentActivities": [ { ... } ],
    "lastUpdated": "2026-11-21T07:00:00.000Z"
  }
}
```

### AI Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/families/:fid/summary/generate` | Member | Trigger AI summary generation |
| GET | `/families/:fid/summary` | Member | List past summaries |
| GET | `/families/:fid/summary/:id` | Member | Get specific summary + source activities |

**POST /families/:fid/summary/generate — Request**
```json
{ "periodDays": 7 }  // defaults to 7 if omitted
```

**Response 202 (async generation)**
```json
{ "success": true, "data": { "summaryId": "...", "status": "generating" } }
```

> Generation is synchronous in P0 (respond when complete, up to 10s). Use 202 + polling (GET /summary/:id) only if Gemini latency exceeds 8s consistently.

---

## 13. Real-Time Communication Architecture

### Socket.IO Server Setup

```
Socket.IO server attached to same HTTP server as Express.
Namespace: / (default)
Rooms: one room per family, named: family:<familyId>
```

### Connection Authentication

1. Client connects with `auth: { token: accessToken }` in handshake.
2. Server middleware validates JWT using same secret as REST middleware.
3. On valid token: attach `socket.userId` and `socket.familyIds` (from Membership query).
4. On invalid token: `socket.disconnect()` immediately.

```js
// Client connection
const socket = io(BACKEND_URL, {
  auth: { token: localStorage.getItem('accessToken') },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

### Room Management

```js
// Server: on connection
const memberships = await Membership.find({ userId: socket.userId, deletedAt: null });
memberships.forEach(m => socket.join(`family:${m.familyId}`));
```

A single user connected to multiple families joins all their rooms simultaneously.

### Event Contracts

All events are emitted to `family:<familyId>` room **excluding the initiating socket** (`socket.to(room).emit(...)`).

| Event | Trigger | Payload |
|---|---|---|
| `task:created` | New task saved | `{ task: TaskObject }` |
| `task:updated` | Task field updated | `{ task: TaskObject, changes: { field: [old, new] } }` |
| `task:completed` | Status → completed | `{ task: TaskObject, completionNote: String }` |
| `task:deleted` | Admin soft-deletes | `{ taskId: String }` |
| `appointment:created` | New appointment | `{ appointment: AppointmentObject }` |
| `appointment:updated` | Appointment updated | `{ appointment: AppointmentObject }` |
| `activity:new` | Any new activity record | `{ activity: ActivityObject }` |
| `member:joined` | New member joined family | `{ member: { userId, name } }` |
| `reminder:upcoming` | Cron-triggered reminder | `{ entityType, entityId, title, dateTime, assignedToId }` |

**Standard Payload Example — task:created**
```json
{
  "task": {
    "_id": "abc123",
    "title": "Book cardiology appointment",
    "status": "pending",
    "priority": "high",
    "assignedTo": { "_id": "uid_arjun", "name": "Arjun Rao", "avatarColor": "#5C8A6E" },
    "createdBy": { "_id": "uid_riya", "name": "Riya Rao" },
    "dueDate": "2026-11-28T00:00:00.000Z",
    "category": "appointment",
    "familyId": "fam123",
    "createdAt": "2026-11-21T07:12:00.000Z"
  }
}
```

### Client Event Handling

```ts
// useSocket.ts
socket.on('task:created', (data) => {
  queryClient.setQueryData(['tasks', familyId], prev => [...prev, data.task]);
  toast.info(`New task: "${data.task.title}" assigned to ${data.task.assignedTo.name}`);
});

socket.on('task:updated', (data) => {
  queryClient.invalidateQueries(['tasks', familyId]);
  queryClient.invalidateQueries(['snapshot', familyId]);
});

socket.on('activity:new', (data) => {
  queryClient.setQueryData(['activities', familyId], prev => [data.activity, ...prev]);
});
```

### Reconnection and Reliability

| Concern | Strategy |
|---|---|
| Client disconnects | Socket.IO auto-reconnect (5 attempts, exponential backoff) |
| Missed events during disconnect | On reconnect, React Query re-fetches stale data via REST |
| Duplicate events | Socket.IO acknowledgements not required; idempotent UI updates |
| Auth token expiry during session | Client intercepts 401, refreshes token, reconnects socket with new token |
| Server restart | Socket.IO rooms are re-joined on reconnect (server-side join logic runs again) |

### Persistence Rule

**MongoDB is the source of truth.** Socket.IO events are emitted **after** successful database write in the route handler. If the emit fails, the data is still persisted and will be fetched on next REST query.

---

## 14. AI Summary Architecture

### Model

`gemini-1.5-flash` (free tier, sufficient for structured text generation).  
API access via `@google/generative-ai` npm package — backend only.

### Generation Flow

```
1. User requests summary (POST /families/:fid/summary/generate)
2. Backend verifies family membership
3. Create CareSummary document with status: 'generating'
4. Fetch last N days of Activity records for familyId
5. Fetch pending + overdue tasks; upcoming appointments
6. Compose structured prompt (see below)
7. Call Gemini API
8. Parse and validate response structure
9. Update CareSummary with content + status: 'ready'
10. Return summary to client
11. Emit activity:new event (action: 'generated')
```

### Prompt Template (v1.0)

```
You are a care coordination assistant for a family managing the health and daily care of an elderly relative.

Your task is to generate a concise, factual family care update based ONLY on the activity records provided below.

RULES:
- Do not invent any activities, appointments, or medications not present in the data.
- Do not make medical diagnoses, treatment recommendations, or medication change suggestions.
- Do not speculate about the care recipient's health condition beyond what is recorded.
- Distinguish clearly between completed activities (facts) and suggested administrative actions.
- Use plain, calm language suitable for a family update.
- Keep each bullet point to one sentence.

REPORTING PERIOD: {{startDate}} to {{endDate}}

ACTIVITY RECORDS:
{{activitiesJSON}}

PENDING TASKS:
{{pendingTasksJSON}}

UPCOMING APPOINTMENTS:
{{upcomingAppointmentsJSON}}

Generate a JSON response with EXACTLY this structure:
{
  "reportingPeriodLabel": "string",
  "recentlyCompleted": ["string", ...],
  "pending": ["string", ...],
  "overdue": ["string", ...],
  "upcomingAppointments": ["string", ...],
  "suggestedActions": ["string", ...],
  "disclaimer": "This summary is generated from recorded family activity logs and is for coordination purposes only. All medical decisions must be made in consultation with qualified healthcare professionals."
}
```

### Response Validation

```js
// aiService.js — validate Gemini response
function validateSummaryResponse(parsed) {
  const required = ['reportingPeriodLabel','recentlyCompleted','pending',
                    'overdue','upcomingAppointments','suggestedActions','disclaimer'];
  for (const key of required) {
    if (!parsed[key]) throw new Error(`Missing field: ${key}`);
  }
  if (!Array.isArray(parsed.recentlyCompleted)) throw new Error('recentlyCompleted must be array');
  // ... validate all array fields
  return parsed;
}
```

### Error Handling

| Failure | Behaviour |
|---|---|
| Gemini API unavailable | Update summary status to 'failed'; return fallback: structured data from DB without narrative |
| Malformed JSON response | Retry once with stricter prompt instruction; if still malformed → 'failed' |
| Rate limit (429) | Return 429 to client with message; do not retry automatically |
| Empty activity records | Return summary with note: "No activities recorded in this period" |
| Response contains medical advice | Strip `suggestedActions` array and log warning; never surface clinical recommendations |

### Data Sent to Gemini (Privacy)

- Activity descriptions (action + entity title).
- Task titles and due dates.
- Appointment titles, dates, doctor names.
- **Excluded:** user email addresses, passwords, raw prescription dosage values, any identity data.

---

## 15. Security and Privacy

### Authentication Security

| Control | Implementation |
|---|---|
| Password hashing | bcrypt, 12 rounds |
| JWT signing | HS256, secret ≥ 32 chars from env |
| Access token expiry | 15 minutes |
| Refresh token expiry | 7 days, stored hashed in DB |
| Refresh token rotation | Issue new refresh token on each /auth/refresh call |
| httpOnly cookie | Refresh token in `Set-Cookie: HttpOnly; Secure; SameSite=Strict` |
| CORS | Whitelist frontend origin only |

### Family Data Isolation

- **Every** database query that returns family-scoped data **must** include `familyId` as a filter condition.
- Middleware `requireFamilyMembership` validates that the authenticated user is a member of the requested `familyId` before any route handler executes.
- `requireRole('admin')` additionally checks the `role` field in Membership.
- These two middleware functions are applied at the **router level**, not individually per route.

### API Validation

- All request bodies validated with Zod schemas before controller execution.
- Path parameters validated as valid ObjectId strings before DB query.
- Pagination limits enforced (max 100 per page).

### Environment Variables

- Never logged, never committed to git.
- Validated at startup using `env.js` (Zod); server refuses to start if required vars are missing.
- Gemini API key stored server-side only; never sent to client.

### AI Safety Guardrails

- Prompt explicitly prohibits medical recommendations.
- `suggestedActions` array is validated to exclude keywords: `prescribe`, `dosage`, `diagnose`, `treat`, `recommend medication` — if detected, field is cleared and warning logged.
- UI displays disclaimer on every AI summary: *"This summary is for coordination purposes only. Consult a qualified healthcare professional for all medical decisions."*

### Data Sensitivity

- Synthetic data only in demo environment.
- Do not store Aadhaar, passport, insurance policy numbers, or biometric data.
- No real patient records to be used.
- Note in UI: *"CareRelay is a care coordination tool. It does not store official medical records."*

---

## 16. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Dashboard snapshot API: <300ms p95. Task list: <200ms p95 (with indexes). |
| **Real-time latency** | Socket event delivery: <1s under normal conditions. |
| **Availability** | Render free tier has cold starts; acceptable for hackathon. Add health check endpoint `/health`. |
| **Responsive design** | Fully functional on 375px (mobile), 768px (tablet), 1280px+ (desktop). |
| **Accessibility** | Semantic HTML, ARIA labels on interactive elements, keyboard navigation for modals and forms, 4.5:1 contrast ratio minimum. |
| **Code architecture** | Controllers thin, business logic in services, no database queries in routes. |
| **Error handling** | All async route handlers wrapped in try/catch; global `errorHandler.js` returns consistent envelope. |
| **Logging** | Use `morgan` for HTTP request logging; console.error for service errors. No sensitive data in logs. |
| **Environment** | All secrets in `.env`; validated at startup; `.env` in `.gitignore`. |
| **Database indexes** | Defined in schema; compound indexes on `familyId + frequently-filtered fields`. |
| **API validation** | Zod on all POST/PATCH request bodies; 400 returned on validation failure with field-level messages. |

---

## 17. MVP Scope and Priorities

### P0 — Must Have (Hackathon Demo)

| Feature | Rationale |
|---|---|
| User registration and login | Gate for everything |
| JWT auth with refresh tokens | Security baseline |
| Family workspace creation and invite | Core product unit |
| Admin/member roles | Prevents unintended mutations |
| Task CRUD with assignment | Core coordination loop |
| Task status and completion flow | Proves accountability |
| Appointment tracking | Key care use case |
| Activity timeline | Shows history |
| Family Snapshot dashboard | Signature feature |
| Real-time sync via Socket.IO | Mandatory differentiator |
| AI-generated care summary | Mandatory differentiator |
| Responsive UI | Usability requirement |

### P1 — Build if Time Allows

| Feature | Effort | Value |
|---|---|---|
| Prescription/refill tracking | Low (schema exists) | High for demo |
| In-app notification centre (bell icon) | Medium | Improves UX |
| Summary export (PDF or copy) | Low | Demo polish |
| Task handoff with context note | Low | Differentiator |
| Email invite (Nodemailer) | Medium | Real-world value |
| Timeline filter UI | Low | Usability |

### P2 — Post-Hackathon

| Feature | Note |
|---|---|
| Document upload (GridFS or S3) | Needs storage decision |
| OCR for prescriptions | Requires separate service |
| Native mobile app (React Native) | Separate codebase |
| Voice interaction | Complex; needs STT service |
| External healthcare integrations | Regulatory complexity |
| Advanced analytics | Low immediate value |
| Subscription/payments | Business model |

---

## 18. Implementation Roadmap

> **Target:** Solo developer, AI-assisted, ~5–7 days to working demo.

### Phase 0 — Project Scaffolding (Day 0.5)

**Objective:** Both apps run; environment validated; Git repo initialised.

**Files:**
- `backend/` — Express app, MongoDB connection, env validation, error handler
- `frontend/` — Vite + React + TS + Tailwind + shadcn/ui initialised

**Prerequisites:** Node.js, npm, MongoDB Atlas cluster URL, Gemini API key.

**Output:** `GET /health` returns `{ ok: true }`; frontend renders at localhost:5173.

**Acceptance:** Server starts without errors; env validation fails fast if vars missing.

---

### Phase 1 — Authentication (Day 1)

**Objective:** Registration, login, JWT + refresh tokens, /auth/me.

**Files:** `User.js`, `RefreshToken.js`, `auth.routes.js`, `auth.controller.js`, `auth.js` middleware.

**Frontend:** `LoginPage.tsx`, `RegisterPage.tsx`, `useAuth.ts`, `api.ts` (Axios + interceptor for 401 → refresh).

**Prerequisites:** Phase 0 complete.

**Acceptance criteria:**
- Register creates user, hashed password stored.
- Login returns access token + sets httpOnly cookie.
- /auth/me returns user when token valid.
- Expired token → 401; refresh → new token.
- Invalid credentials → 401 with error message.

---

### Phase 2 — Family Workspace (Day 1.5)

**Objective:** Family creation, invite link, join flow, member list.

**Files:** `Family.js`, `Membership.js`, `family.routes.js`, `family.controller.js`, `requireFamilyMembership.js`, `requireRole.js`.

**Frontend:** `SettingsPage.tsx` (family management), `InvitePage.tsx`.

**Prerequisites:** Phase 1 complete.

**Acceptance criteria:**
- Create family → user is admin member.
- Invite link generated; second user joins → member role.
- Family data isolated: user outside family gets 403.
- Member list shows all users with roles.

---

### Phase 3 — Task Management (Day 2)

**Objective:** Full task CRUD, assignment, status transitions, filters.

**Files:** `CareTask.js`, `tasks.routes.js`, `tasks.controller.js`, `activityService.js` (creates Activity on each mutation).

**Frontend:** `TasksPage.tsx`, `TaskCard.tsx`, `TaskForm.tsx`, `TaskFilters.tsx`, `TaskDetailPage.tsx`.

**Prerequisites:** Phase 2 complete.

**Acceptance criteria:**
- Create task with all fields; validation rejects missing required fields.
- List with status/priority/overdue filters works.
- Status transitions enforce rules (cannot skip to completed without note).
- Completion note required (min 5 chars).
- Activity record created on create/update/complete.
- Admin soft-delete works; deleted tasks not returned in list.

---

### Phase 4 — Real-Time Sync (Day 2.5)

**Objective:** Socket.IO server attached; family rooms; events emitted and received.

**Files:** `socketServer.js`, `socketService.js`; update task/appointment controllers to call `socketService`.

**Frontend:** `useSocket.ts`, `socketStore.ts`; wire `task:created`, `task:updated`, `task:completed`, `activity:new` to React Query invalidation.

**Prerequisites:** Phase 3 complete.

**Acceptance criteria:**
- Two browser sessions (different users, same family): task created in one appears in other's task list <1s.
- Disconnected user: on reconnect, React Query re-fetches and shows latest state.
- User outside family room does not receive events.

---

### Phase 5 — Appointments and Dashboard Snapshot (Day 3)

**Objective:** Appointment CRUD; snapshot aggregation API; dashboard UI.

**Files:** `Appointment.js`, `appointments.routes.js`, `appointment.controller.js`; add `/snapshot` route.

**Frontend:** `AppointmentsPage.tsx`, `DashboardPage.tsx`, all snapshot sub-components.

**Prerequisites:** Phase 4 complete.

**Acceptance criteria:**
- Appointment create/list/update works.
- Snapshot returns correct counts: completed/pending/overdue (overdue = !completed + dueDate < now).
- Dashboard renders in <300ms.
- Upcoming appointments displayed (next 7 days, sorted ascending).
- Outstanding responsibilities listed with assignee name.

---

### Phase 6 — Activity Timeline (Day 3.5)

**Objective:** Timeline page with all activity records; filters; real-time prepend.

**Files:** `Activity.js`, `activities.routes.js` (GET only), `TimelinePage.tsx`, `ActivityItem.tsx`.

**Prerequisites:** Phases 3–5 (activities created by those phases).

**Acceptance criteria:**
- Timeline shows all family activities, newest first.
- Filter by entity type and actor works.
- New activities appear in real time via `activity:new` socket event.
- Actor initials and colour are displayed correctly.

---

### Phase 7 — AI Summary (Day 4)

**Objective:** AI summary generation, storage, display, error handling.

**Files:** `CareSummary.js`, `aiService.js`, `summary.routes.js`, `SummaryPage.tsx`, `SummaryBlock.tsx`.

**Prerequisites:** Phase 6 complete (needs activity records).

**Acceptance criteria:**
- Generate summary: returns structured content within 10s.
- Summary stored in DB; re-requesting returns new summary (not cached).
- Source activity list viewable.
- Gemini unavailable → graceful fallback message shown.
- Malformed response → 'failed' status, user sees error.
- Disclaimer always visible.
- No medical recommendations surfaced.

---

### Phase 8 — Polish and Demo Prep (Day 5)

**Objective:** Empty states, error states, responsive design, seed data, demo flow rehearsal.

**Files:** All pages — add empty/error/loading states. Seed script: `backend/scripts/seed.js`.

**Acceptance criteria:**
- All P0 acceptance criteria pass.
- Demo scenario end-to-end working with synthetic data.
- Mobile layout (375px) functional for all core pages.
- No console errors in production build.

---

### Integration Checkpoints

| After Phase | Verify |
|---|---|
| 2 | Auth + family isolation working end-to-end |
| 4 | Real-time visible across two open browser windows |
| 5 | Dashboard shows correct counts from real DB data |
| 7 | AI summary generated from actual seed activity records |
| 8 | Full demo scenario runnable without manual DB manipulation |

---

### Critical Dependencies

```
Gemini API Key → Phase 7
MongoDB Atlas connection string → Phase 0
Socket.IO cors config → Phase 4 (must match frontend origin)
JWT_SECRET length ≥ 32 chars → Phase 1
```

### Common Risks and Recovery

| Risk | Recovery |
|---|---|
| Socket.IO CORS blocked | Verify `cors` option in socketServer matches FRONTEND_URL exactly |
| Gemini rate limit hit during demo | Pre-generate and store demo summaries; show stored result |
| Render cold start during demo | Implement `/health` ping; warm up server before demo |
| MongoDB Atlas IP whitelist | Add `0.0.0.0/0` for Render (dynamic IPs); note security trade-off |
| Refresh token cookie not sent | Ensure frontend and backend are on same SameSite context (use CORS credentials) |

---

## 19. Testing and Acceptance Criteria

### P0 Acceptance Criteria Checklist

| Feature | Test | Pass Condition |
|---|---|---|
| Registration | POST /auth/register with valid data | 201, user in DB, password hashed |
| Login | POST /auth/login | 200, access token + httpOnly cookie |
| Token refresh | POST /auth/refresh with valid cookie | 200, new access token |
| Family isolation | Member of Family A queries Family B tasks | 403 Forbidden |
| Task create | POST task with all required fields | 201, task in DB, activity logged |
| Task assign | Assign to member of same family | Assignee's task list updates |
| Task complete | PATCH with status=completed + completionNote | completedAt set, activity logged |
| Task complete (no note) | PATCH with status=completed, no note | 400, validation error |
| Overdue tasks | Task with dueDate in past, status=pending | Appears in overdue filter |
| Real-time sync | Create task in browser A | Browser B shows task <1s |
| Reconnection | Disconnect browser B, create task in A, reconnect B | B shows task after reconnect |
| Socket auth | Connect socket with invalid token | Disconnected immediately |
| AI summary | POST /summary/generate with seed data | Structured summary returned, no medical advice |
| AI failure | Gemini key invalid | Error message shown, no crash |
| Dashboard snapshot | GET /snapshot | All 5 counts correct, upcoming + overdue listed |
| Responsive | Dashboard at 375px width | No horizontal scroll, readable |
| Role enforcement | Member attempts DELETE task | 403 Forbidden |

### Demo Seed Test Cases

Using synthetic data (`seed.js`):
1. 3 users registered and joined one family.
2. 5 tasks: 2 completed, 2 pending, 1 overdue.
3. 2 appointments: 1 upcoming, 1 completed.
4. 1 prescription record.
5. 10+ activity records covering all action types.

---

## 20. Hackathon Demonstration Flow

### Setup

1. Open two browser windows side by side.
2. Window A: logged in as **Riya** (admin).
3. Window B: logged in as **Arjun** (member).
4. Both viewing the Family Snapshot Dashboard.

### Demo Steps

| Step | Action | Evidence |
|---|---|---|
| 1 | Riya creates task "Collect scan report" assigned to Arjun, due today, priority: urgent | Window B: task appears instantly, toast notification |
| 2 | Arjun updates status to in-progress | Window A: task card status updates; activity feed shows Arjun's action |
| 3 | Arjun completes task with note "Collected from KIMS. File saved." | Window A: completed count increments; overdue count unchanged |
| 4 | Both windows: Activity Timeline shows full history | Timeline shows all 3 steps with actors and timestamps |
| 5 | Riya clicks "Generate Family Update" | AI summary generated; structured output displayed; disclaimer shown |
| 6 | Riya opens Summary → Source Records | Linked activities displayed; proves summary is grounded in data |
| 7 | Show Dashboard Snapshot | Answers all 5 care questions; Arjun's pending tasks visible |
| 8 | Show mobile layout (375px DevTools) | Dashboard readable, navigation functional |

### Synthetic Family Profile

```
Family: Rao Family Care
Care Recipient: Venkateswara Rao, 72, Guntur (synthetic)
Conditions: Type 2 Diabetes, Hypertension (synthetic)

Members:
- Riya Rao (admin)   | riya@demo.carerelay.app    | Bangalore
- Arjun Rao (member) | arjun@demo.carerelay.app   | Hyderabad
- Priya Rao (member) | priya@demo.carerelay.app   | Pune
```

---

## 21. Risks and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gemini API quota exhausted | Medium | High | Pre-generate demo summaries; store in DB; show pre-generated on demo |
| Render free tier cold start (30–60s) | High | Medium | Health check pinger; warm up 5 min before demo |
| Socket.IO auth failure | Low | High | Test cross-origin setup early (Phase 4 checkpoint) |
| MongoDB Atlas connection failure | Low | High | Have local MongoDB fallback for demo if needed |
| AI generates medical advice | Low | High | Prompt guardrails + response validation strip `suggestedActions` if detected |
| Scope creep beyond P0 | Medium | Medium | Strict P0 checklist; defer P1 until all P0 criteria pass |
| Refresh token not sent cross-origin | Medium | High | Use `credentials: 'include'` in Axios; set `SameSite=None; Secure` on cookie for cross-origin |

---

## 22. Scalability and Future Opportunities

> These are post-hackathon considerations, not P0 requirements.

| Opportunity | Description |
|---|---|
| Multi-tenant SaaS | Architecture already supports multiple families per user |
| Mobile app | React Native with shared type definitions |
| Document storage | GridFS or S3-compatible storage for prescriptions and reports |
| OCR | Google Cloud Vision for prescription digitisation |
| WhatsApp integration | Twilio API to send task reminders via WhatsApp |
| Health data integration | FHIR-compatible record import from hospital systems |
| Subscription model | Family plan pricing; premium AI summary frequency |
| Caregiver network | Connect families with professional caregivers |
| Regional language support | i18n for Telugu, Hindi, Tamil |
| Offline support | Service Worker + IndexedDB for offline task creation |

---

## 23. Additional Recommendations

### Recommendation 1: Care Notes on Tasks (P0)

**Problem:** When a task is reassigned or long-running, context is lost.  
**Value:** Family members understand why something changed without asking.  
**Implementation:** `notes[]` array already in schema; add note input in `TaskDetailPage`.  
**Complexity:** Low — text field + array push, one API call.

### Recommendation 2: Colour-Coded Member Avatars (P0)

**Problem:** In shared views, it is not obvious at a glance who did what.  
**Value:** Instant visual recognition of family members.  
**Implementation:** Assign deterministic colour from a fixed palette on registration (stored in `avatarColor` field). Render initials in that colour across all components.  
**Complexity:** Trivial.

### Recommendation 3: "Who's on it?" Panel on Snapshot (P0)

**Problem:** "Who is responsible for outstanding items?" is the most critical question in distributed caregiving.  
**Value:** Answers the question without navigating away.  
**Implementation:** `Outstanding Responsibilities` section already in dashboard spec above. Backend: query pending + in-progress tasks, group by assignedTo, return top 5.  
**Complexity:** Low — one aggregation query.

### Recommendation 4: Summary Refresh Guard (P1)

**Problem:** Users might spam "Generate Summary" causing API cost.  
**Value:** Cost control; better UX (shows last summary if generated <1 hour ago).  
**Implementation:** Check latest `CareSummary.createdAt`; if <60 min, return cached with "Generated N minutes ago" label; allow force-regenerate via param.  
**Complexity:** Low.

### Recommendation 5: Soft Reconnect UX Banner (P0)

**Problem:** User doesn't know if real-time sync is active.  
**Value:** Trust in live data.  
**Implementation:** Socket `disconnect`/`connect` events update Zustand `isConnected` state; show banner "⚠ Reconnecting…" / "✓ Live" indicator.  
**Complexity:** Low — already in socket store.

### Recommendation 6: Seed Script as Demonstration Tool (P0 Demo)

**Problem:** Demo with empty state is unconvincing.  
**Value:** Rich, realistic demo in <30 seconds.  
**Implementation:** `backend/scripts/seed.js` — creates synthetic family, members, 10 tasks, 3 appointments, 1 prescription, 15 activities. Run with `npm run seed`.  
**Complexity:** Low; pay it off during Phase 8.

---

## 24. Environment Variables and Setup Requirements

### Backend `.env`

```env
# Server
PORT=5000
NODE_ENV=development

# Database (REQUIRED)
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/carerelay

# Auth (REQUIRED)
JWT_SECRET=<random-string-min-32-chars>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
REFRESH_TOKEN_COOKIE_SECRET=<another-random-string-min-32-chars>

# AI (REQUIRED for Phase 7)
GEMINI_API_KEY=<your-google-ai-studio-api-key>

# CORS (REQUIRED)
FRONTEND_URL=http://localhost:5173

# Optional
LOG_LEVEL=info
```

### Frontend `.env` (Vite)

```env
# Backend API (REQUIRED)
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

> **Note:** `VITE_` prefix required for Vite to expose variables to the client bundle. Never put secrets in frontend env vars.

### External Services Required

| Service | Purpose | Free Tier | Credentials Required |
|---|---|---|---|
| MongoDB Atlas | Database | 512MB M0 cluster (free) | Connection string |
| Google AI Studio | Gemini API | 15 req/min, 1M tokens/day (free) | API key |
| Render | Backend hosting | 750 hours/month free | Render account |
| Vercel | Frontend hosting | Generous free tier | Vercel account |

### Setup Checklist

```
□ MongoDB Atlas: Create M0 cluster → get connection string → whitelist 0.0.0.0/0 for Render
□ Google AI Studio: Create project → enable Gemini API → generate API key
□ Set all backend .env vars → run env validation at startup
□ Set frontend .env vars → verify VITE_API_URL accessible
□ Run npm install in both /backend and /frontend
□ Run npm run seed to populate demo data
□ Verify GET /health returns 200
□ Verify Socket.IO connects (browser console: "Socket connected")
□ Verify AI summary generates successfully before demo
□ Render: add env vars in dashboard → deploy backend
□ Vercel: add VITE_ vars in dashboard → deploy frontend → verify CORS
```

---

## Terminology Reference

| Term | Definition |
|---|---|
| Family workspace | A shared space for one care unit (e.g., one elderly parent's care) |
| Activity | An immutable log entry recording any change in the system |
| Task | An assignable, trackable unit of care work with owner and deadline |
| Snapshot | The dashboard view answering the 5 key care questions |
| Summary | AI-generated plain-language narrative of recent family care activity |
| Member | A user who belongs to a family workspace |
| Admin | A member with elevated permissions (delete, manage members) |
| Care recipient | The person being cared for (not a system user) |

---

*CareRelay PRD v1.0 — ACE Builder Hackathon — Problem Statement 4: Family Care Hub*  
*All personas, care records and medical conditions referenced in this document are synthetic and for demonstration purposes only.*  
*CareRelay is a care coordination tool. It does not replace qualified medical professionals.*
