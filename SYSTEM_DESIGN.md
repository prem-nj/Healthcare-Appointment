# System Design: Healthcare Appointment & Follow-up Manager

## 1. Double-Booking Prevention & Concurrency Control
Double booking is eliminated through database-level ACID transactions in PostgreSQL. When a booking request arrives, `AppointmentService.bookAppointment` executes within `prisma.$transaction`. Inside this isolated boundary:
1. Active appointments overlapping the target `[startTime, endTime]` interval are re-checked for the doctor.
2. If any conflicting appointment exists with status `CONFIRMED`, `PENDING`, or `HELD`, the transaction aborts with a `409 Conflict` error (`SLOT_CONFLICT`).
3. Active slot holds held by other patients are checked.
4. The new appointment and symptom intake records are inserted atomically.
This guarantees that under high concurrency, exactly one request commits while concurrent attempts fail cleanly.

## 2. Temporary Slot Hold Mechanism
To enhance user experience during symptom intake, patients can acquire a 5-minute temporary slot hold (`SlotHold` model).
- A hold records `doctorId`, `patientId`, `startTime`, `endTime`, and `expiresAt` (now + 5 minutes).
- Slot calculation marks held slots as unavailable to other patients while active.
- When the holding patient confirms booking, the hold is released atomically within the booking transaction.
- An asynchronous maintenance worker (`SlotService.cleanupExpiredHolds`) automatically releases expired uncommitted holds.

## 3. Doctor Leave Conflict Handling
When an administrator registers an approved leave window for a doctor:
- `LeaveService.createDoctorLeave` executes within a database transaction.
- It identifies all active appointments overlapping `[leaveStartDate, leaveEndDate]`.
- Instead of silent deletion, affected appointments are updated to `CANCELLED_BY_LEAVE` with `cancellationReason = "Doctor on approved leave"`.
- Audit logs record all affected appointment IDs.
- Post-transaction background dispatchers queue `APPOINTMENT_CANCELLED_BY_LEAVE` email notifications with direct rebooking links and cancel corresponding Google Calendar events.

## 4. Notification Reliability & Email Retry Strategy
All transactional emails are backed by the `Notification` relational model with states `PENDING -> SENDING -> SENT -> FAILED`.
- **Idempotency:** Notifications use deterministic idempotency keys (e.g., `appt_confirm_patient_<id>`) to prevent duplicate email delivery.
- **Retry Backoff:** Failed dispatches record `lastError` and increment `retryCount` up to a maximum of 3 retries.
- **Admin Visibility:** Administrators can view the notification delivery queue and trigger one-click manual retries or automated cron processing.

## 5. Non-Blocking Integration Resiliency (LLM & Google Calendar)
External integrations (LLMs, Google Calendar, SMTP) must **never** roll back an appointment or consultation.
- **Post-Transaction Execution:** LLM summary generation, email dispatch, and Google Calendar syncing run asynchronously after the database transaction commits.
- **LLM Failure Handling:** If OpenAI/Gemini times out or returns malformed JSON, a deterministic rule-based triage fallback executes, `PreVisitSummary` is flagged `status = FAILED`, and the appointment remains confirmed.
- **Calendar Failure Handling:** Token refresh failures or calendar downtime update `lastSyncError` on the connection without disturbing clinical appointments.

## 6. Database Design & Normalization
The PostgreSQL schema (managed via Prisma ORM) is normalized across 18 models:
- Core Entities: `User`, `PatientProfile`, `DoctorProfile`, `Specialization`, `DoctorWorkingHour`, `DoctorLeave`.
- Scheduling: `Appointment`, `SlotHold`, `SymptomSubmission`, `PreVisitSummary`.
- Clinical Consultation: `Consultation`, `Prescription`, `Medication`, `MedicationReminder`, `PostVisitSummary`.
- Integrations & Governance: `Notification`, `GoogleCalendarConnection`, `AuditLog`.
Indexes are placed on `[doctorId, startTime]`, `[patientId, startTime]`, `[status]`, `[status, dueTime]`, and `[action, createdAt]` for fast query retrieval.

## 7. Background Jobs & Reminder Scheduling
Medication reminder schedules are calculated based on medication frequency (`once_daily` = 09:00, `twice_daily` = 09:00 & 21:00, `three_times_daily` = 08:00, 14:00 & 20:00, `four_times_daily` = 08:00, 12:00, 16:00 & 20:00).
- Reminders are written with unique idempotency keys `rem_<medId>_<timestamp>`.
- A background worker (`/api/jobs/run` protected by `JOB_SECRET`) dispatches due reminders, retries failed notifications, and cleans up expired slot holds.

## 8. Security & Role-Based Access Control (RBAC)
- Passwords hashed using bcrypt (10 rounds).
- Stateless JWT sessions stored in `httpOnly`, `Secure`, `SameSite=Lax` cookies.
- Server-side route middleware enforces role boundaries (`PATIENT`, `DOCTOR`, `ADMIN`).
- All inputs validated via Zod schemas before database processing.

## 9. Scalability Considerations
- Stateless Next.js App Router endpoints allow horizontal scaling across serverless edge or containers.
- Database connection pooling managed via `pg.Pool` / `@prisma/adapter-pg`.
- Read replicas can be attached for doctor searches and appointment history queries.
