# REST API Documentation: MediCare Connect

All API endpoints follow RESTful conventions, return JSON responses, and use standard HTTP status codes.

---

## Authentication & Session Endpoints

### 1. Register User
`POST /api/auth/register`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password@123456",
    "phone": "+1 555-0199",
    "role": "PATIENT"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com", "role": "PATIENT" },
      "token": "jwt_token_string"
    }
  }
  ```

### 2. Login User
`POST /api/auth/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "doctor.jenkins@healthcare.com",
    "password": "Password@123456"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "name": "Dr. Sarah Jenkins", "role": "DOCTOR", "doctorProfileId": "uuid" },
      "token": "jwt_token_string"
    }
  }
  ```

### 3. Get Current Session
`GET /api/auth/me`
- **Auth:** Required (Cookie `auth_token` or Header `Authorization: Bearer <token>`)
- **Response (200 OK):** Current user object, patient/doctor profile, and Google Calendar sync status.

### 4. Logout User
`POST /api/auth/logout`
- **Auth:** Public (Clears `auth_token` cookie)

---

## Doctor & Availability Endpoints

### 5. List Doctors & Search
`GET /api/doctors?q=cardio&specializationId=uuid`
- **Auth:** Public
- **Query Parameters:** `q` (search string), `specializationId` (filter)
- **Response (200 OK):** Array of active doctor profiles with specializations and working hours.

### 6. Get Doctor Profile
`GET /api/doctors/:id`
- **Auth:** Public
- **Response (200 OK):** Doctor profile, bio, consultation fee, working hours, and approved leaves.

### 7. Get Available Slots for Doctor
`GET /api/doctors/:id/availability?date=YYYY-MM-DD`
- **Auth:** Public
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "date": "2026-08-25",
      "doctorId": "uuid",
      "slots": [
        {
          "startTime": "2026-08-25T09:00:00.000Z",
          "endTime": "2026-08-25T09:30:00.000Z",
          "timeString": "09:00 - 09:30",
          "isAvailable": true
        }
      ]
    }
  }
  ```

---

## Appointment & Clinical Workflow Endpoints

### 8. Temporary Slot Hold
`POST /api/appointments/hold`
- **Auth:** PATIENT
- **Request Body:**
  ```json
  {
    "doctorId": "uuid",
    "startTime": "2026-08-25T10:00:00.000Z",
    "durationMinutes": 30
  }
  ```
- **Response (201 Created):** Created `SlotHold` record with 5-minute `expiresAt`.

### 9. Atomic Appointment Booking
`POST /api/appointments`
- **Auth:** PATIENT
- **Request Body:**
  ```json
  {
    "doctorId": "uuid",
    "startTime": "2026-08-25T10:00:00.000Z",
    "holdId": "uuid",
    "symptoms": {
      "chiefComplaint": "Exertional chest discomfort",
      "symptoms": "Mild pressure when climbing stairs for 5 minutes",
      "duration": "2 weeks",
      "severity": "Moderate",
      "additionalNotes": "Father had early heart disease"
    }
  }
  ```
- **Response (201 Created):** Confirmed `Appointment` object. Triggers background Pre-Visit AI summary, email confirmation, and Google Calendar sync.

### 10. List User Appointments
`GET /api/appointments?status=CONFIRMED`
- **Auth:** Required (Filters automatically by patient, doctor, or all for admin)

### 11. Get Full Appointment Details
`GET /api/appointments/:id`
- **Auth:** Assigned Patient, Assigned Doctor, or ADMIN
- **Response (200 OK):** Full relational appointment object including symptoms, pre-visit AI summary, clinical notes, diagnosis, prescription, and post-visit AI summary.

### 12. Cancel Appointment
`POST /api/appointments/:id/cancel`
- **Auth:** Patient, Doctor, or Admin
- **Request Body:** `{ "reason": "Scheduling conflict" }`

### 13. Reschedule Appointment
`POST /api/appointments/:id/reschedule`
- **Auth:** Patient, Doctor, or Admin
- **Request Body:** `{ "newStartTime": "2026-08-26T14:00:00.000Z" }`

### 14. Doctor Submit Consultation & Prescription
`POST /api/appointments/:id/consultation`
- **Auth:** DOCTOR (Assigned doctor only)
- **Request Body:**
  ```json
  {
    "clinicalNotes": "Normal cardiovascular exam. Mild tension headache symptoms.",
    "diagnosis": "Tension Headache",
    "followUpInstructions": "Rest, hydrate, return in 2 weeks if unresolved",
    "recommendedFollowUpDate": "2026-09-08",
    "medications": [
      {
        "name": "Acetaminophen",
        "dosage": "500mg",
        "frequency": "twice_daily",
        "duration": "5 days",
        "instructions": "Take after food",
        "startDate": "2026-08-25",
        "endDate": "2026-08-30"
      }
    ]
  }
  ```
- **Response (201 Created):** Consultation & Prescription saved. Sets status `COMPLETED`, generates medication reminders, and triggers Post-Visit AI summary.

### 15. Retry AI Generation
`POST /api/appointments/:id/retry-ai`
- **Auth:** DOCTOR or ADMIN
- **Request Body:** `{ "type": "PRE_VISIT" | "POST_VISIT" }`

---

## Admin Endpoints

### 16. Admin Overview Statistics
`GET /api/admin/stats`
- **Auth:** ADMIN

### 17. Admin Create Doctor
`POST /api/admin/doctors`
- **Auth:** ADMIN

### 18. Admin Apply Doctor Leave (Conflict Resolution)
`POST /api/admin/doctors/:id/leave`
- **Auth:** ADMIN
- **Request Body:**
  ```json
  {
    "startDate": "2026-09-01T00:00:00.000Z",
    "endDate": "2026-09-05T23:59:59.000Z",
    "reason": "Attending Medical Symposium"
  }
  ```
- **Response (201 Created):** Created `DoctorLeave` and returns count of cancelled conflicting appointments.

### 19. Admin List Notification Queue
`GET /api/admin/notifications`
- **Auth:** ADMIN

### 20. Admin Retry Failed Notification
`POST /api/admin/notifications/:id/retry`
- **Auth:** ADMIN

---

## Background Maintenance Job Trigger

### 21. Execute Background Jobs
`POST /api/jobs/run`
- **Auth:** ADMIN session or Header `Authorization: Bearer <JOB_SECRET>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Background jobs executed successfully",
      "results": {
        "slotHoldsCleaned": 2,
        "remindersProcessed": [],
        "notificationsRetried": [],
        "upcomingRemindersSent": 1
      }
    }
  }
  ```
