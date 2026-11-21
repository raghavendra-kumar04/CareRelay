# CareRelay — Codebender IDE Workflow Guide

> **Purpose:** Codebender settings, token efficiency rules, and step-by-step project completion checklist  
> **PRD Reference:** [CARERELAY_PRD.md](./CARERELAY_PRD.md)  
> **Date:** 2026-11-21

---

## Part 1 — Codebender IDE Setup for Low Token Usage

### 1.1 Create a `.codebender` or `AGENTS.md` Configuration File

Place this at **project root** (`d:\CareRelay\`). Codebender reads it as persistent context — it replaces repeated re-explanation every session.

```md
# AGENTS.md — CareRelay Project Context

## Stack
- Backend: Node.js + Express + MongoDB (Mongoose) + Socket.IO + JWT
- Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui + React Query + Zustand
- AI: Gemini API (backend only, never frontend)
- Auth: JWT access token (15min) + refresh token (httpOnly cookie, 7d)

## Directory Layout
- /backend/src/models      → Mongoose schemas
- /backend/src/routes      → Express routers (thin)
- /backend/src/controllers → Business logic handlers
- /backend/src/services    → activityService, socketService, aiService
- /backend/src/middleware  → auth.js, requireRole.js, validate.js, errorHandler.js
- /backend/src/socket      → socketServer.js
- /frontend/src/components → UI components (shadcn/ui base in /ui)
- /frontend/src/pages      → One file per route
- /frontend/src/hooks      → useSocket.ts, useAuth.ts, useTasks.ts
- /frontend/src/store      → Zustand stores

## Conventions
- All DB queries must include familyId filter
- Activity record created on every mutation (via activityService)
- Socket event emitted AFTER DB write (via socketService)
- All request bodies validated with Zod before controller
- Soft deletes: deletedAt field, never hard-delete
- Error response format: { success: false, error: { code, message } }
- Success response format: { success: true, data: { ... } }

## Do Not
- Never query DB in route files (only in controllers/services)
- Never expose Gemini API key to frontend
- Never skip familyId guard on family-scoped routes
- Never store secrets in code — use process.env only
```

---

### 1.2 Codebender Settings Checklist

| Setting | Recommended Value | Reason |
|---|---|---|
| **Context mode** | Manual / On-demand (not auto-index) | Prevents full codebase scan on every prompt |
| **File inclusion** | Explicit `@file` references only | Don't let IDE pull in unrelated files |
| **Max context files** | 3–5 per prompt | Keeps tokens bounded |
| **Auto-attach node_modules** | OFF | Never include; massive token waste |
| **Auto-attach package-lock.json** | OFF | Not useful for generation tasks |
| **Response length** | Concise / Medium | Long responses burn tokens; request expansions explicitly |
| **Model** | Use mid-tier (GPT-4o / Claude Sonnet / Gemini 1.5 Pro) | Save frontier model credits for complex architecture decisions |
| **History retention** | Per-task sessions (not one long thread) | Stale history degrades output quality |
| **System prompt / Rules** | Point to AGENTS.md | Single source of truth |
| **Autocomplete trigger** | Delay 300–500ms | Avoids wasted completions on partial typing |
| **Inline suggestions** | Enabled only in active edit files | Disable for read-only/reference files |

---

### 1.3 Prompt Engineering Rules for This Project

#### ✅ Efficient Prompt Patterns

```
# Good — scoped, specific, file-referenced
"In @backend/src/controllers/tasks.controller.js, 
implement the PATCH /:id handler. It should:
1. Validate body with Zod (fields: status, completionNote, assignedTo, priority)
2. Check status transition rules from PRD Section 7-C
3. Call activityService.log() after DB save
4. Call socketService.emit('task:updated', ...) after activity log
Return updated task populated with assignedTo.name and avatarColor."
```

```
# Good — reference schema directly
"Using the CareTask schema defined in @backend/src/models/CareTask.js,
write the GET /families/:fid/tasks query with these filters:
status, assignedTo, priority, overdue (dueDate < now && status != completed).
Paginate with page/limit from query params."
```

#### ❌ Wasteful Prompt Patterns

```
# Bad — forces full project scan
"How does authentication work in my app?"

# Bad — no context boundary
"Build the tasks feature"

# Bad — includes unnecessary files
"Here is my entire backend folder [paste 2000 lines]..."
```

---

### 1.4 Session Management Strategy

| Phase | Recommended Sessions |
|---|---|
| Phase 0 (Scaffolding) | 1 session: scaffold both apps |
| Phase 1 (Auth) | 2 sessions: backend auth → frontend auth |
| Phase 2 (Family) | 2 sessions: backend family → frontend settings |
| Phase 3 (Tasks) | 3 sessions: model+routes → controller+service → frontend |
| Phase 4 (Socket.IO) | 1 focused session: socketServer + useSocket hook |
| Phase 5 (Appointments + Snapshot) | 2 sessions: backend → frontend dashboard |
| Phase 6 (Timeline) | 1 session: route + ActivityItem component |
| Phase 7 (AI Summary) | 2 sessions: aiService → SummaryPage |
| Phase 8 (Polish + Seed) | 2 sessions: empty/error states → seed script |

**Rule:** One session per module. Close and start fresh when you switch between backend and frontend for the same feature.

---

### 1.5 `.gitignore` — Prevent Token Waste from Junk Files

```gitignore
# Root
node_modules/
.env
.env.local
*.log
dist/
build/
.DS_Store

# Frontend
frontend/dist/
frontend/.env
frontend/.env.local

# Backend  
backend/.env
backend/logs/
```

---

## Part 2 — Step-by-Step Project Completion Plan

Follow Phase order from PRD Section 18. Each step below is a **single Codebender task**.

---

### Phase 0 — Scaffolding (Day 0.5)

**Checkpoint goal:** Both servers start, MongoDB connects, `/health` returns 200.

```
Step 0.1 □  mkdir backend && cd backend && npm init -y
            Install: express mongoose dotenv cors morgan helmet bcrypt 
                     jsonwebtoken zod cookie-parser socket.io 
                     @google/generative-ai node-cron uuid

Step 0.2 □  mkdir frontend && cd frontend
            npm create vite@latest . -- --template react-ts
            Install: axios react-router-dom @tanstack/react-query zustand 
                     socket.io-client react-hot-toast lucide-react
            Setup: Tailwind CSS + shadcn/ui init

Step 0.3 □  Create backend/src/config/env.js (Zod validation of all env vars)
            Create backend/src/config/db.js (Mongoose connect)
            Create backend/src/app.js (Express + CORS + morgan + errorHandler)
            Create backend/src/middleware/errorHandler.js

Step 0.4 □  Add GET /health endpoint → returns { ok: true, timestamp }

Step 0.5 □  Create .env files (backend + frontend)
            Create AGENTS.md at project root
            Initialize git + .gitignore
```

**✅ Verification:**
```bash
# Terminal 1
cd backend && npm run dev  # → "MongoDB connected" + "Server running on 5000"
# Terminal 2  
curl http://localhost:5000/health  # → { ok: true }
# Terminal 3
cd frontend && npm run dev  # → Vite dev server on 5173, no console errors
```

---

### Phase 1 — Authentication (Day 1)

**Checkpoint goal:** Register → Login → Protected route works end-to-end.

```
Step 1.1 □  Create backend/src/models/User.js
            Create backend/src/models/RefreshToken.js (TTL index on expiresAt)
            
Step 1.2 □  Create backend/src/routes/auth.routes.js
            Create backend/src/controllers/auth.controller.js
            Implement: register, login, refresh, logout, getMe
            
Step 1.3 □  Create backend/src/middleware/auth.js (JWT verify → req.user)
            Create backend/src/middleware/validate.js (Zod wrapper)
            
Step 1.4 □  Frontend: Create frontend/src/lib/api.ts
            Axios instance with baseURL, interceptor:
              → attach Authorization: Bearer <token>
              → on 401: call /auth/refresh → retry original request
              → on refresh fail: redirect to /login
              
Step 1.5 □  Frontend: Create useAuth hook (Zustand store for user state)
            Create LoginPage.tsx + RegisterPage.tsx
            Create ProtectedRoute wrapper component
```

**✅ Verification:**
```
POST /auth/register  → 201, user created, password NOT in response
POST /auth/login     → 200, accessToken in body, Set-Cookie: refreshToken httpOnly
GET  /auth/me        → 200 with valid token; 401 with expired/no token
POST /auth/refresh   → 200 with valid cookie; 401 with expired cookie
POST /auth/logout    → 200, refresh token deleted from DB
```
**Manual test:** Register in UI → see dashboard placeholder (not login page).

---

### Phase 2 — Family Workspace (Day 1.5)

**Checkpoint goal:** Create family → invite link → second user joins → member list visible.

```
Step 2.1 □  Create backend/src/models/Family.js
            Create backend/src/models/Membership.js
            (compound unique index: familyId + userId)
            
Step 2.2 □  Create backend/src/middleware/requireFamilyMembership.js
            → reads :fid from req.params, checks Membership, attaches req.membership
            Create backend/src/middleware/requireRole.js
            → checks req.membership.role against required role
            → Apply BOTH at router level, not per-route
            
Step 2.3 □  Create backend/src/routes/family.routes.js
            Create backend/src/controllers/family.controller.js
            Implement: createFamily, getFamily, getMyFamilies,
                       regenerateInvite, joinByToken, getMembers, removeMember

Step 2.4 □  Frontend: SettingsPage.tsx → Create family form
            InvitePage.tsx → handle /invite/:token
            useFamily hook → React Query for family data
```

**✅ Verification:**
```
POST /families                     → 201, creator is admin in Membership
POST /families/:id/invite          → 200, new inviteToken returned
POST /families/join/:token         → 200, new member with role='member'
GET  /families/:id/members         → lists both members with roles
GET  /families/:id (outsider user) → 403 Forbidden
```
**Critical test:** Log in as User B with User A's family ID → must get 403.

---

### Phase 3 — Task Management (Day 2)

**Checkpoint goal:** Create → assign → update → complete task. Activity log created on each action.

```
Step 3.1 □  Create backend/src/models/CareTask.js
            Create backend/src/models/Activity.js
            (Activity is append-only — no update/delete routes)
            
Step 3.2 □  Create backend/src/services/activityService.js
            Function: log({ familyId, actorId, actorName, entityType, 
                            entityId, entityTitle, action, meta })
            → Creates Activity document
            → Called by EVERY mutating controller
            
Step 3.3 □  Create backend/src/routes/tasks.routes.js
            Create backend/src/controllers/tasks.controller.js
            Implement: createTask, listTasks (with filters), getTask,
                       updateTask, deleteTask (admin only, soft-delete)
            Status transition guard: completed requires completionNote (min 5 chars)
            Overdue filter: dueDate < new Date() && status !== 'completed'
            
Step 3.4 □  Frontend: TasksPage.tsx + TaskCard.tsx + TaskForm.tsx
            TaskFilters.tsx (status, priority, assignedTo, overdue toggles)
            TaskDetailPage.tsx (notes thread, history, status update button)
            useTasks hook → React Query
```

**✅ Verification:**
```
POST /families/:fid/tasks (missing title)      → 400 validation error
POST /families/:fid/tasks (valid)              → 201, activity record created
PATCH /:id (status=completed, no note)         → 400 "completionNote required"
PATCH /:id (status=completed, note present)    → 200, completedAt set
GET  /?overdue=true                            → only tasks where dueDate < now
DELETE /:id (member role)                      → 403 Forbidden
DELETE /:id (admin role)                       → 200, deletedAt set, not in list
```

---

### Phase 4 — Real-Time Sync (Day 2.5)

**Checkpoint goal:** Create task in Window A → appears in Window B in <1 second.

```
Step 4.1 □  Create backend/src/socket/socketServer.js
            - Attach to same HTTP server as Express
            - Auth middleware: validate JWT from handshake.auth.token
            - On connect: query Memberships → join family:<familyId> rooms
            - On disconnect: Socket.IO handles cleanup automatically
            
Step 4.2 □  Create backend/src/services/socketService.js
            Function: emitToFamily(familyId, event, payload, excludeSocket?)
            → Uses global io instance → io.to(`family:${familyId}`).emit(...)
            → Called by controllers AFTER successful DB write + activity log
            
Step 4.3 □  Update tasks.controller.js: 
            After DB save + activityService.log() →
            call socketService.emitToFamily(familyId, 'task:created', { task })
            After update → emit 'task:updated'
            After complete → emit 'task:completed'
            
Step 4.4 □  Frontend: Create frontend/src/hooks/useSocket.ts
            - io(VITE_SOCKET_URL, { auth: { token }, reconnection: true,
              reconnectionAttempts: 5 })
            - On connect: set isConnected = true in Zustand
            - On disconnect: set isConnected = false → show banner
            - On task:created → queryClient.setQueryData (prepend)
            - On task:updated/completed → queryClient.invalidateQueries
            - On activity:new → prepend to activities cache
            
Step 4.5 □  Add RealTimeIndicator component (green/grey dot) to Navbar
            Add "Reconnecting..." banner (Zustand isConnected state)
```

**✅ Verification:**
```
Open two browser tabs, login as different users (same family)
Tab A: Create task → Tab B: task appears without refresh ✓
Tab A: Complete task → Tab B: status badge updates ✓
Disconnect Tab B from DevTools network → Create task in A → 
  Reconnect Tab B → task visible (via REST re-fetch) ✓
Connect socket with fake token → socket disconnected immediately ✓
User in Family A cannot receive Family B events ✓
```

---

### Phase 5 — Appointments + Dashboard Snapshot (Day 3)

**Checkpoint goal:** Dashboard answers all 5 care questions from real DB data.

```
Step 5.1 □  Create backend/src/models/Appointment.js
            Create backend/src/routes/appointments.routes.js
            Create backend/src/controllers/appointments.controller.js
            Implement: createAppointment, listAppointments (filters: 
                       status, assignedTo, upcoming), getAppointment,
                       updateAppointment, deleteAppointment (admin, soft)
            Emit: appointment:created, appointment:updated via socketService
            
Step 5.2 □  Add GET /families/:fid/snapshot to family.routes.js
            Single aggregation query returns:
              counts: { completed, pending, overdue }
              upcomingAppointments: next 7 days, limit 5, populated assignedTo
              overdueItems: tasks where dueDate < now && !completed, limit 5
              recentActivities: last 5 activities, populated actorId
              lastUpdated: new Date()
            Use Promise.all([...]) for parallel queries — not sequential
            
Step 5.3 □  Frontend: DashboardPage.tsx
            SnapshotCounters.tsx (3 cards: Done / Pending / Overdue)
            UpcomingPanel.tsx (appointment list)
            ResponsibilityPanel.tsx (overdue items with assignee)
            RecentActivity.tsx (last 5 activity items)
            AppointmentsPage.tsx + AppointmentCard.tsx
            useSnapshot hook → React Query, refetch on task/appointment socket events
```

**✅ Verification:**
```
GET /families/:fid/snapshot          → all 5 data sections present
Counts match actual DB records       ✓
Overdue logic: task dueDate=yesterday, status=pending → appears in overdue ✓
Upcoming: appointment dateTime=tomorrow → appears in upcoming ✓
Dashboard renders in <300ms (check Network tab) ✓
On mobile 375px: no horizontal scroll ✓
```

---

### Phase 6 — Activity Timeline (Day 3.5)

**Checkpoint goal:** Chronological feed visible. Filters work. New items prepend in real time.

```
Step 6.1 □  Create backend/src/routes/activities.routes.js (GET only)
            Create backend/src/controllers/activities.controller.js
            Query: { familyId, deletedAt: null } sorted by createdAt: -1
            Filters: entityType, actorId, startDate, endDate
            Paginate: page/limit (max 50 per page)
            
Step 6.2 □  Frontend: TimelinePage.tsx
            ActivityItem.tsx: actor initials circle (avatarColor), 
              action badge, entity chip, relative timestamp (use date-fns)
            Filter bar: entity type dropdown, actor dropdown, date range
            Infinite scroll or "Load more" pagination
            socket.on('activity:new') → prepend to list with slide-in animation
```

**✅ Verification:**
```
GET /activities                                → all activities, newest first ✓
GET /activities?entityType=task                → only task activities ✓
GET /activities?actorId=<uid>                  → only that user's activities ✓
Create task in another tab → activity prepends in timeline tab ✓
Pagination: page=2 returns next batch ✓
```

---

### Phase 7 — AI Summary (Day 4)

**Checkpoint goal:** Generate summary from seed data. Display structured output with disclaimer. Handle Gemini failure gracefully.

```
Step 7.1 □  Create backend/src/models/CareSummary.js
            Create backend/src/services/aiService.js
              - Function: generateSummary(familyId, periodDays, requestingUserId)
              - Fetch: Activities (last N days), pending tasks, upcoming appointments
              - Exclude: email, passwords, raw user IDs from prompt data
              - Build prompt using template from PRD Section 14
              - Call Gemini: model.generateContent(prompt)
              - Parse JSON from response.text()
              - Validate structure (all required keys + array types)
              - Strip suggestedActions if medical keywords detected
              - Return validated content object
              
Step 7.2 □  Create backend/src/routes/summary.routes.js
            Create backend/src/controllers/summary.controller.js
            POST /generate:
              1. Create CareSummary { status: 'generating' }
              2. Call aiService.generateSummary()
              3. On success: update { status: 'ready', content, sourceActivityIds }
              4. On error: update { status: 'failed', errorMessage }
              5. Return summary document
            GET /:id → return summary + populate sourceActivityIds (limit 20)
            GET / → list family summaries (newest first, limit 10)
            
Step 7.3 □  Frontend: SummaryPage.tsx
            "Generate Family Update" button (disabled during generation)
            Loading state: "Generating family update..." animated text
            SummaryBlock.tsx: render each section with headers
            Disclaimer: always visible, styled as muted info block
            "View source records" → expandable list of sourceActivities
            Past summaries list (last 10)
            Error state: "Unable to generate summary. Please try again."
            Fallback: if status=failed, show structured DB data without narrative
```

**✅ Verification:**
```
POST /summary/generate (valid family, seed data) → 
  returns structured summary within 10s ✓
Disclaimer present in response content ✓
suggestedActions contains no medical terms ✓
POST /summary/generate (GEMINI_API_KEY=invalid) → 
  status='failed', errorMessage set, frontend shows error ✓
GET /summary/:id → sourceActivityIds populated, linkable ✓
```

---

### Phase 8 — Polish, Seed Data, Demo Prep (Day 5)

**Checkpoint goal:** All P0 acceptance criteria pass. Demo runnable from cold start.

```
Step 8.1 □  Add empty states to all list pages:
            - Tasks empty: "No tasks yet. Create your first task →" [button]
            - Timeline empty: "No activity recorded yet."
            - Appointments empty: "No appointments scheduled."
            - Summary: "No summaries yet. Generate your first family update →"

Step 8.2 □  Add error states:
            - API error: inline error card with retry button
            - Network error: toast "Connection error. Check your network."
            - Form validation: field-level error messages (Zod errors from API)

Step 8.3 □  Add skeleton loaders (shadcn/ui Skeleton):
            - Dashboard: 3 counter skeletons + list skeletons
            - Tasks list: 5 TaskCard skeletons
            - Timeline: 5 ActivityItem skeletons

Step 8.4 □  Create backend/scripts/seed.js:
            Run with: npm run seed
            Creates:
              - 3 users: riya@demo.carerelay.app, arjun@demo.carerelay.app,
                         priya@demo.carerelay.app (password: Demo@1234)
              - 1 family: "Rao Family Care"
              - Riya = admin, Arjun + Priya = member
              - 5 tasks: 2 completed (with notes), 2 pending, 1 overdue
              - 2 appointments: 1 upcoming (next week), 1 completed
              - 1 prescription: Metformin (synthetic)
              - 15 activity records covering all action types

Step 8.5 □  Responsive layout audit:
            - Test at 375px, 768px, 1280px
            - Bottom tab bar on mobile, top nav on desktop
            - Modal forms full-screen on mobile

Step 8.6 □  Production build test:
            cd frontend && npm run build  → 0 TypeScript errors
            cd backend && node src/app.js  → starts cleanly with prod env

Step 8.7 □  Deploy:
            Render: Create Web Service → connect GitHub → add env vars → deploy
            Vercel: Import project → set VITE_API_URL + VITE_SOCKET_URL → deploy
            Verify: CORS works between Vercel URL and Render URL
```

**✅ Final Verification (Full Demo Run):**
```
□ npm run seed → no errors, DB populated
□ Open localhost:5173/login → login as riya@demo.carerelay.app
□ Dashboard shows: 2 completed, 2 pending, 1 overdue, 1 upcoming appointment
□ Open second tab → login as arjun@demo.carerelay.app
□ Riya creates task "Pick up medication" assigned to Arjun
□ Arjun's tab: task appears instantly
□ Arjun updates to in-progress → Riya's tab updates
□ Arjun completes with note → Riya's completed count increments
□ Timeline: shows full sequence with both actors
□ Riya generates AI summary → structured output, disclaimer visible
□ Open source records → 15+ activities linkable
□ Mobile 375px: dashboard readable, navigation works
□ No console errors in either tab
```

---

## Part 3 — Quick Reference

### File-to-Prompt Map

When asking Codebender to work on a feature, include ONLY these files:

| Task | Include in context |
|---|---|
| Auth bug | `auth.controller.js`, `auth.js` middleware, `User.js` |
| Task creation | `CareTask.js`, `tasks.controller.js`, `activityService.js`, `socketService.js` |
| Socket issue | `socketServer.js`, `socketService.js`, `useSocket.ts` |
| AI summary bug | `aiService.js`, `summary.controller.js`, `CareSummary.js` |
| Dashboard data | `family.controller.js` (snapshot), `DashboardPage.tsx`, `useSnapshot.ts` |
| Auth in frontend | `api.ts`, `useAuth.ts`, `LoginPage.tsx` |

### Common Prompt Templates

```
"Implement [function] in @[file].
Inputs: [describe params]
Expected output: [describe return]
Side effects: [activity log / socket emit / none]
Error cases to handle: [list]
Do not modify any other files."
```

```
"Debug this error in @[file]:
[paste ONLY the relevant error lines — not entire stack trace]
Current behaviour: [what happens]
Expected behaviour: [what should happen]"
```

```
"Write Zod validation schema for [endpoint] request body.
Fields: [list field names, types, constraints]
Place in @backend/src/middleware/validate.js as a named export."
```

### Daily Commit Cadence

```bash
git add -A && git commit -m "phase-X: [what was completed]"
# After each phase verification passes — not every file save
```

Suggested branch structure:
```
main              ← demo-ready, deploys to prod
dev               ← active development
feature/phase-X   ← one branch per phase, merge to dev when verified
```

---

*CareRelay Codebender Workflow Guide v1.0 — 2026-11-21*
