# CareRelay 🌿

> **Care doesn't stop when families live apart.**  
> A real-time, AI-assisted care coordination platform built for families managing elderly parents across different cities.

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18%2B-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-v5%2B-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Mongoose-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?logo=socket.io)](https://socket.io/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-4285F4?logo=google)](https://ai.google.dev/)

---

## 📌 Problem & Motivation

In modern families, adult children often live in different cities or abroad (e.g., Bangalore, Hyderabad) while elderly parents live alone in their hometown (e.g., Guntur). Coordination typically relies on fragmented WhatsApp group chats and phone calls, causing three major breakdowns:

1. **Zero Accountability:** Critical responsibilities (prescription refills, doctor bookings) get lost in chat noise, leading to dangerous assumptions that *"someone else handled it."*
2. **Clinical Blindness at Clinic Visits:** When accompanying an elderly parent to a doctor consultation, family members struggle to recall exact dosages, past ECG dates, or recent diagnostic test results.
3. **Cognitive Overload:** Sifting through hundreds of messages across busy workdays just to understand if parents are safe creates constant anxiety.

**CareRelay** solves this by transforming unorganized chats into a structured, accountable, and transparent family coordination hub.

---

## ✨ Key Features

### ⏱️ The 10-Second Family Snapshot
- Instant visual counters (**Completed**, **Pending / In-Progress**, and **Needs Attention / Overdue**).
- Gives any sibling complete peace of mind in under 10 seconds, regardless of which city they wake up in.

### 👥 Multi-Patient Care Circles
- Track multiple care recipients (e.g., **Father** managing cardiology recovery and **Mother** undergoing knee osteoarthritis physiotherapy) in a single family workspace.
- Seamlessly switch between patients or select **All** to aggregate household metrics.

### ✅ Accountable Task Management with Mandatory Completion Notes
- Enforces a verifiable status lifecycle: `pending` → `in-progress` → `completed`.
- **Mandatory Completion Notes:** Tasks cannot be marked completed without a descriptive note (min. 5 characters, e.g. *"Refill collected from Apollo Pharmacy, kept in medicine box"*), eliminating ambiguity.

### 🩺 Consultations & Printable "Doctor Visit One-Pager"
- Track doctor appointments with date, clinic, specialty, and accompanying sibling.
- **Doctor Visit Sheet:** With one click, generate a clean, confidential, printable 1-page clinical summary aggregating active medications, recent lab diagnostics, emergency family contacts, and a doctor observation section.

### ⚡ Real-Time Socket.IO Synchronized Audit Trail
- Family-scoped rooms (`family:<familyId>`) emit live websocket events:
  - `task:created`, `task:updated`, `task:completed`
  - `appointment:created`, `appointment:updated`
  - `activity:new`, `member:joined`
- Every status update, reassignment, or note instantly reflects across all siblings' screens.

### 🤖 Grounded AI Care Assistant (Gemini 1.5 Flash)
- **Strictly Grounded:** The backend-only Gemini model answers family questions based exclusively on recorded MongoDB activity logs without medical hallucinations.
- **Weekly Executive Digest:** Automatically synthesizes weekly progress, overdue items, upcoming appointments, and suggested administrative actions for busy caregivers.

### 🔒 Enterprise-Grade Multi-Tenant Isolation
- Role-based permissions (**Admin** vs **Member**).
- Cryptographic invite tokens with expiration for safe family onboarding.
- Soft-delete architecture (`deletedAt`) ensures compliance and historical traceability.

---

## 🏗️ Architecture & Tech Stack

```
CareRelay/
├── backend/
│   ├── src/
│   │   ├── config/          # db.js (Mongoose), env.js (Zod environment validation)
│   │   ├── controllers/     # Business logic modules (auth, family, tasks, etc.)
│   │   ├── middleware/      # auth, requireRole, requireFamilyMembership, validate
│   │   ├── models/          # User, Family, Membership, CareTask, Appointment, etc.
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # activityService, socketService, aiService, authService
│   │   ├── socket/          # socketServer.js (JWT handshake & room orchestration)
│   │   └── app.js           # Express + HTTP Server + Socket.IO bootstrap
│   └── scripts/             # seed.js, seed_expo.js, full_verification.js
│
└── frontend/
    ├── src/
    │   ├── components/      # UI components, layout, tasks, appointments, family
    │   ├── hooks/           # useAuth, useTasks, useAppointments, useSnapshot, useSocket
    │   ├── lib/             # api.ts (Axios + auto-refresh interceptor), familyApi
    │   ├── pages/           # Dashboard, Tasks, Appointments, Timeline, Summary, Settings
    │   ├── store/           # authStore, familyStore, patientStore, socketStore (Zustand)
    │   └── types/           # Complete TypeScript interfaces
    └── vercel.json          # SPA routing configuration for Vercel
```

### Stack Summary
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query (React Query v5), Zustand, Lucide React.
- **Backend:** Node.js, Express 5, MongoDB (Mongoose), Socket.IO, JWT (15-min access + 7-day HTTP-only refresh cookie), Zod, Helmet.
- **AI:** Google Gemini API (`gemini-1.5-flash`) — backend-only, zero frontend exposure.

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
- [Google Gemini API Key](https://ai.google.dev/) (Optional, for AI summaries & chat)

---

### 1. Clone the Repository
```bash
git clone https://github.com/raghavendra-kumar04/CareRelay.git
cd CareRelay
```

---

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/carerelay?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
REFRESH_TOKEN_COOKIE_SECRET=your_super_secret_cookie_key_at_least_32_characters_long
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here
```

Seed the demo presentation dataset:
```bash
npm run seed
# or for expo-ready multi-patient data:
node scripts/seed_expo.js
```

Start the backend server:
```bash
npm run dev
# Backend running at http://localhost:5000
```

---

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Start the frontend development server:
```bash
npm run dev
# Frontend running at http://localhost:5173
```

---

## 🔑 Demo Credentials

| Role | Name | Email | Password | Location |
|---|---|---|---|---|
| **Admin** | Riya Rao | `riya.rao@carerelay.demo` | `Demo@1234` | Bangalore |
| **Member** | Arjun Rao | `arjun.rao@carerelay.demo` | `Demo@1234` | Hyderabad |
| **Member** | Priya Rao | `priya.rao@carerelay.demo` | `Demo@1234` | Guntur (Local) |

---

## 🌐 Production Deployment

### Backend on [Render](https://render.com)
1. Create a **Web Service** connected to your GitHub repository.
2. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
3. Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<Atlas Connection String>`
   - `JWT_SECRET`: `<32+ Character Secret>`
   - `REFRESH_TOKEN_COOKIE_SECRET`: `<32+ Character Secret>`
   - `FRONTEND_URL`: `https://<YOUR-VERCEL-APP>.vercel.app`
   - `GEMINI_API_KEY`: `<Gemini API Key>`

### Frontend on [Vercel](https://vercel.com)
1. Import the repository in **Vercel**.
2. Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment Variables (Type: **Config**):
   - `VITE_API_URL`: `https://<YOUR-RENDER-BACKEND>.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://<YOUR-RENDER-BACKEND>.onrender.com`

---

## 🧪 Verification & Testing

CareRelay includes an automated **8-phase verification suite** that validates all core features, security checks, and real-time synchronization:

```bash
cd backend
node scripts/full_verification.js
```

### Verification Checks:
- ✅ **Phase 0:** Health check endpoints (`/health`, `/api/health`).
- ✅ **Phase 1:** User registration, bcrypt authentication, and JWT lifecycles.
- ✅ **Phase 2:** Family workspace creation, multi-tenant data isolation guards.
- ✅ **Phase 3:** Task creation, priority validation, mandatory completion note rejection.
- ✅ **Phase 4:** Socket.IO handshake and real-time room dispatch.
- ✅ **Phase 5:** Appointment scheduling and 10-second family snapshot SLA (<1000ms).
- ✅ **Phase 6:** Immutable activity feed chronology.
- ✅ **Phase 7:** AI Care Summary generation and graceful degradation.
- ✅ **Phase 8:** Frontend compilation (0 TypeScript errors).

---

## 🛡️ Security & Privacy Guardrails

1. **Family Scoping on Every Query:** Every MongoDB query strictly includes `{ familyId, deletedAt: null }` to guarantee data isolation.
2. **Backend-Only AI:** The Gemini API key is never bundled in frontend assets or exposed in client responses.
3. **Immutable Activity Ledger:** Activity records cannot be edited or deleted via Mongoose middleware.
4. **Cross-Origin Cookie Protection:** Refresh tokens are stored in `httpOnly`, `secure`, `sameSite: none` cookies for production resilience between Vercel and Render.
5. **Soft Deletes Only:** Documents are marked with `deletedAt`, ensuring full medical and administrative auditability.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
