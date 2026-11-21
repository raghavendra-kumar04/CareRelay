# AGENTS.md — CareRelay Project Context

> Read this file before every Codebender session. Do not regenerate it.

## Stack
- **Backend:** Node.js + Express + MongoDB (Mongoose) + Socket.IO + JWT
- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui + React Query + Zustand
- **AI:** Gemini API (gemini-1.5-flash) — backend only, never frontend
- **Auth:** JWT access token (15min) + refresh token (httpOnly cookie, 7 days)
- **Real-time:** Socket.IO rooms named `family:<familyId>`

## Directory Layout
```
backend/src/
  config/      → db.js, env.js (Zod validation)
  middleware/  → auth.js, requireRole.js, requireFamilyMembership.js, validate.js, errorHandler.js
  models/      → User, Family, Membership, CareTask, Appointment, Prescription, Activity, CareSummary, RefreshToken
  routes/      → auth, family, tasks, appointments, prescriptions, activities, summary
  controllers/ → one file per route module (business logic here, not in routes)
  services/    → activityService.js, socketService.js, aiService.js
  socket/      → socketServer.js (Socket.IO init + auth + room join)
  jobs/        → reminderJob.js (node-cron, hourly)
  app.js       → Express + Socket.IO bootstrap

frontend/src/
  components/ui/      → shadcn/ui primitives
  components/layout/  → AppLayout.tsx, Navbar.tsx
  components/tasks/   → TaskCard, TaskForm, TaskFilters
  components/dashboard/ → SnapshotCounters, UpcomingPanel, ResponsibilityPanel, RecentActivity
  components/summary/ → SummaryBlock
  components/timeline/ → ActivityItem
  pages/       → one file per route
  hooks/       → useSocket.ts, useAuth.ts, useTasks.ts, useFamily.ts, useSnapshot.ts
  store/       → socketStore.ts (Zustand: isConnected, events)
  lib/         → api.ts (Axios + interceptors), utils.ts
  types/       → index.ts (all TypeScript interfaces)
```

## API Conventions
- Base URL: `/api`
- Success: `{ success: true, data: { ... } }`
- Error: `{ success: false, error: { code: "STRING", message: "..." } }`
- Paginated: `{ success: true, data: [...], pagination: { page, limit, total } }`
- All routes under `/families/:fid/...` are guarded by `requireFamilyMembership` middleware
- Admin-only operations use `requireRole('admin')` middleware

## Critical Rules (Never Violate)
1. **Every** family-scoped DB query must include `familyId` as a filter
2. Activity record created by `activityService.log()` on **every** mutating operation
3. Socket event emitted by `socketService.emitToFamily()` **after** DB write + activity log
4. Gemini API key is **backend-only** — never in frontend env vars or responses
5. Soft deletes only — `deletedAt` field, never hard-delete documents
6. All POST/PATCH request bodies validated with Zod before controller runs
7. No DB queries in route files — only in controllers and services

## Status Transitions (CareTask)
- `pending` → `in-progress` → `completed`
- Completing requires `completionNote` (minimum 5 characters)
- Completed tasks are immutable (admin exception)

## Socket.IO Events
| Event | Emitted When |
|---|---|
| `task:created` | New task saved |
| `task:updated` | Task field changed |
| `task:completed` | Status → completed |
| `appointment:created` | New appointment |
| `appointment:updated` | Appointment changed |
| `activity:new` | Any new Activity document |
| `member:joined` | New user joined family |

## Env Vars Required
- Backend: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `FRONTEND_URL`
- Frontend: `VITE_API_URL`, `VITE_SOCKET_URL`

## PRD Reference
Full specification: `./CARERELAY_PRD.md`
