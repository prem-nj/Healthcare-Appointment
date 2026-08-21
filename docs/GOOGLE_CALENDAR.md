# Google Calendar OAuth 2.0 Integration Guide

This guide walks through configuring Google Cloud Console credentials to enable real-time, two-way appointment synchronization with Google Calendar.

---

## 1. Google Cloud Console Setup

1. Log into the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `MediCare Connect` (or select an existing project).
3. Navigate to **APIs & Services** > **Library**.
4. Search for and enable the **Google Calendar API**.

---

## 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **User Type** as **External** (or Internal for Google Workspace domains).
3. Fill in the App Name (`MediCare Connect`) and support email.
4. Under **Scopes**, click **Add or Remove Scopes** and select:
   - `https://www.googleapis.com/auth/calendar.events` (Manage calendar events)
   - `https://www.googleapis.com/auth/userinfo.email` (View email address)
5. Under **Test Users**, add your test email accounts.

---

## 3. Create OAuth 2.0 Client Credentials

1. Go to **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**.
2. Select **Application Type**: **Web application**.
3. Set **Name**: `Healthcare Appointment Web Client`.
4. Under **Authorized Redirect URIs**, add:
   - For local development: `http://localhost:3000/api/google/callback`
   - For production: `https://your-deployment-domain.com/api/google/callback`
5. Click **Create** and copy your **Client ID** and **Client Secret**.

---

## 4. Configure Environment Variables

Add the credentials to your `.env` file:

```env
GOOGLE_CLIENT_ID="1234567890-abcdef.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxx"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"
```

---

## 5. Synchronization Flow & Resiliency

- **Connection:** Patients and doctors click **"Connect Google Calendar"** in their dashboard, which redirects to the Google OAuth consent screen.
- **Token Management:** The authorization code is exchanged for an `access_token` and `refresh_token`, stored securely in `GoogleCalendarConnection`.
- **Appointment Created:** An event is automatically created on the primary calendar of both doctor and patient with appointment details, clinic location, and chief complaint.
- **Appointment Rescheduled:** The existing calendar event is updated with the new start and end timestamps.
- **Appointment Cancelled:** The event is deleted from both calendars.
- **Failure Handling:** Calendar sync is entirely non-blocking. If a user revokes permissions or Google APIs time out, the core database appointment remains fully confirmed and an error is safely logged.
