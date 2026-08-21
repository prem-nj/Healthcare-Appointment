# MediCare Connect — Healthcare Appointment & Follow-up Manager

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20Passed-emerald)](https://vitest.dev/)

An enterprise-grade full-stack healthcare appointment scheduling, consultation, and automated follow-up platform with ACID double-booking prevention, assistive AI clinical triage, two-way Google Calendar synchronization, relational e-prescriptions, and smart medication reminders.

---

## 1. Overview

**MediCare Connect** is designed for modern healthcare clinics to streamline the end-to-end patient consultation lifecycle:
- **Patient Registration & Discovery:** Patients find specialized doctors, view real-time availability slots, hold slots temporarily for 5 minutes, submit structured symptoms, and book appointments.
- **AI Assistive Triage:** Patient symptoms are analyzed into pre-visit clinical triage summaries with urgency categorization and suggested inquiries for the doctor.
- **Clinical Workspace:** Doctors review upcoming schedules, urgent cases, record consultation notes, and build multi-dosage relational prescriptions.
- **Patient-Friendly Follow-Up:** Clinical notes are converted into compassionate patient-friendly explanations, daily routine medication breakdowns, and actionable care steps.
- **Medication Reminders:** Background cron dispatchers generate automated email reminders at scheduled dosage times with idempotency and retry backoff.
- **Admin Governance:** Clinic administrators configure doctors, working hours, slot durations, and approved leaves with automatic conflict resolution for impacted appointments.

---

## 2. Key Features

- **Double-Booking Prevention:** Multi-phase concurrency locking inside PostgreSQL database transactions guarantees that no two patients can claim the same slot simultaneously.
- **5-Minute Temporary Slot Hold:** Protects slots while patients complete their pre-visit symptom intake.
- **Doctor Leave Conflict Management:** Automatically cancels affected appointments with status `CANCELLED_BY_LEAVE`, notifies patients with direct rebooking options, deletes calendar events, and writes audit trails.
- **Resilient AI Pipelines:** Non-blocking LLM execution with strict structured Zod parsing and deterministic fallback heuristics if external APIs are unavailable.
- **Two-Way Google Calendar OAuth:** Automatically synchronizes confirmed appointments, updates on reschedule, and deletes on cancellation.
- **Relational Prescriptions & Reminders:** Handles once-daily, twice-daily, three-times-daily, and four-times-daily dosing schedules with idempotent reminder tracking.
- **Notification Reliability Queue:** Tracks delivery status (`PENDING`, `SENDING`, `SENT`, `FAILED`) with exponential retry backoff.

---

## 3. Tech Stack

- **Frontend:** Next.js (App Router, Turbopack), React, TypeScript, Tailwind CSS, Lucide Icons, React Hook Form, Zod.
- **Backend:** Next.js Route Handlers (REST APIs), TypeScript.
- **Database & ORM:** PostgreSQL, Prisma ORM 7.9, `@prisma/adapter-pg`.
- **Authentication:** Stateless JWT session tokens in `httpOnly` secure cookies with bcrypt password hashing and role-based access control (RBAC).
- **LLM Provider:** OpenAI API / Gemini API via structured JSON outputs with non-blocking rule-based fallback.
- **Email:** Nodemailer with SMTP transporter and development stream fallback.
- **Calendar:** Google Calendar API (OAuth 2.0 with offline refresh tokens).
- **Testing:** Vitest for unit, concurrency, state machine, and resilience testing.

---

## 4. Project Structure

```
├── docs/
│   ├── GOOGLE_CALENDAR.md        # Google OAuth 2.0 Cloud Console setup
│   └── LLM_PROMPTS.md            # Clinical prompt specifications & safety
├── prisma/
│   ├── schema.prisma             # Normalized PostgreSQL schema (18 models)
│   └── seed.ts                   # Comprehensive development seed data
├── src/
│   ├── app/                      # Next.js App Router (Pages & REST APIs)
│   │   ├── admin/                # Admin Console
│   │   ├── api/                  # 28 RESTful API Route Handlers
│   │   ├── appointments/[id]/    # Appointment Details View
│   │   ├── book/[doctorId]/      # 4-step Appointment Booking flow
│   │   ├── dashboard/            # Patient Portal Dashboard
│   │   ├── doctor-portal/        # Doctor Clinical Workspace
│   │   ├── doctors/              # Doctor Directory & Search
│   │   ├── login/                # Authentication Sign-In
│   │   ├── medications/          # Medication Hub & Reminder Schedule
│   │   └── register/             # Patient Registration
│   ├── components/ui/            # Reusable UI component library
│   ├── lib/                      # Auth, Prisma Client, API helpers
│   ├── services/                 # Core Business Logic Layer
│   │   ├── appointment.service.ts# Atomic booking & concurrency transactions
│   │   ├── consultation.service.ts# Clinical notes & relational prescriptions
│   │   ├── email.service.ts      # Reusable templates, notifications & retries
│   │   ├── google-calendar.service.ts # Two-way OAuth calendar synchronization
│   │   ├── job.service.ts        # Cron & background worker orchestrator
│   │   ├── leave.service.ts      # Doctor leave & conflict resolution
│   │   ├── llm.service.ts        # Pre-visit & post-visit assistive summaries
│   │   ├── reminder.service.ts   # Dosage schedule calculation & reminders
│   │   └── slot.service.ts       # Slot calculation & 5-min temporary holds
│   └── validators/               # Zod schemas for all requests & AI outputs
├── tests/                        # Vitest automated test suites
├── API.md                        # Complete REST API reference
├── SYSTEM_DESIGN.md              # Technical system design write-up
├── PROJECT_STATUS.md             # Verification & deployment summary
└── package.json
```

---

## 5. Prerequisites

- **Node.js:** v18.0.0 or later (tested on Node v24)
- **npm:** v9.0.0 or later
- **Database:** PostgreSQL (Neon, Supabase, AWS RDS, or local PostgreSQL instance)

---

## 6. Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd healthcare-appointment
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   *(See section below for variable descriptions)*

4. **Initialize Prisma & Generate Client:**
   ```bash
   npx prisma generate
   ```

5. **Apply Database Schema / Migrations:**
   ```bash
   npx prisma db push
   ```

6. **Seed Initial Demo Data:**
   ```bash
   npm run seed
   ```

7. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Environment Variables (`.env.example`)

```env
# Database (PostgreSQL - Neon / Supabase / Local PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/healthcare_appointments?schema=public"

# Auth / JWT Secret
AUTH_SECRET="super-secret-jwt-key-minimum-32-chars-long-example"
APP_URL="http://localhost:3000"

# LLM Configuration (OpenAI, Gemini, or Mock fallback)
LLM_PROVIDER="openai"
LLM_API_KEY="your-openai-or-gemini-api-key"
LLM_MODEL="gpt-4o-mini"

# Google Calendar OAuth 2.0
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"

# Email Configuration (Nodemailer / SMTP)
EMAIL_HOST="smtp.mailtrap.io"
EMAIL_PORT="2525"
EMAIL_USER="your-smtp-username"
EMAIL_PASSWORD="your-smtp-password"
EMAIL_FROM="Healthcare Clinic <no-reply@healthcare-clinic.com>"

# Clinic & Timezone Settings
CLINIC_TIMEZONE="America/New_York"

# Background Job & Webhook Security
JOB_SECRET="job-cron-secret-key-12345"
```

---

## 8. Demo Accounts & Credentials

The seed script creates pre-configured accounts for testing:

| Role | Email | Password | Details |
|---|---|---|---|
| **Patient** | `patient@healthcare.com` | `Password@123456` | John Doe (Sample appointments & symptoms) |
| **Doctor** | `doctor.jenkins@healthcare.com` | `Password@123456` | Dr. Sarah Jenkins (Cardiology, $120 fee) |
| **Doctor** | `doctor.chen@healthcare.com` | `Password@123456` | Dr. Marcus Chen (Dermatology, with approved leave) |
| **Doctor** | `doctor.rodriguez@healthcare.com` | `Password@123456` | Dr. Emily Rodriguez (Neurology, $150 fee) |
| **Doctor** | `doctor.wilson@healthcare.com` | `Password@123456` | Dr. James Wilson (General Medicine, $75 fee) |
| **Admin** | `admin@healthcare.com` | `Password@123456` | Clinic Administrator (Full access) |

---

## 9. Running Tests

Execute the automated Vitest test suite:

```bash
npm run test
```

Test coverage includes:
- **Authentication & RBAC:** Password hashing, token signing, JWT verification, role boundaries.
- **Booking & Concurrency:** Overlapping interval detection, atomic double-booking prevention.
- **Slot Hold:** 5-minute hold expiration, uncommitted lock releases.
- **State Machine:** Verification of valid and invalid appointment status transitions.
- **Doctor Leave:** Impacted appointment conflict cancellation and notification generation.
- **LLM Safety:** Structured Zod output validation and non-blocking timeout fallbacks.
- **Email & Reminders:** Idempotent reminder scheduling and retry queues.

---

## 10. Medical Safety & AI Limitations

> [!CAUTION]
> **Clinical Non-Diagnostic Disclaimer:**
> MediCare Connect is an appointment scheduling and clinical communication platform. AI outputs are assistive aids designed to summarize patient-submitted symptoms and draft patient-friendly instructions. The AI does not diagnose medical conditions, suggest drug therapies, or modify physician decisions. The licensed doctor remains solely responsible for all clinical assessments, diagnosis, and treatment plans.
