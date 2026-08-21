import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export class GoogleCalendarService {
  private static getOAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/callback";

    if (!clientId || !clientSecret || clientId === "your-google-oauth-client-id") {
      return null;
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Generates the Google OAuth 2.0 authorization URL
   */
  static getAuthorizationUrl(userId: string): string | null {
    const oauth2Client = this.getOAuthClient();
    if (!oauth2Client) return null;

    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ];

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      state: userId,
    });
  }

  /**
   * Exchanges OAuth authorization code for tokens and saves connection
   */
  static async handleAuthCallback(code: string, userId: string) {
    const oauth2Client = this.getOAuthClient();
    if (!oauth2Client) {
      throw new Error("Google OAuth credentials are not configured");
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const expiryDate = tokens.expiry_date ? BigInt(tokens.expiry_date) : null;

    await prisma.googleCalendarConnection.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token || null,
        expiryDate,
        scope: tokens.scope || null,
        tokenType: tokens.token_type || null,
        email: userInfo.data.email || null,
        syncEnabled: true,
        lastSyncStatus: "CONNECTED",
      },
      update: {
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token ? tokens.refresh_token : undefined,
        expiryDate,
        scope: tokens.scope || undefined,
        tokenType: tokens.token_type || undefined,
        email: userInfo.data.email || undefined,
        syncEnabled: true,
        lastSyncStatus: "CONNECTED",
      },
    });

    return { email: userInfo.data.email };
  }

  /**
   * Helper to get an authenticated calendar client for a user
   */
  private static async getAuthenticatedCalendar(userId: string) {
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });

    if (!connection || !connection.syncEnabled) return null;

    const oauth2Client = this.getOAuthClient();
    if (!oauth2Client) return null;

    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken || undefined,
    });

    oauth2Client.on("tokens", async (newTokens) => {
      await prisma.googleCalendarConnection.update({
        where: { userId },
        data: {
          accessToken: newTokens.access_token || connection.accessToken,
          refreshToken: newTokens.refresh_token || connection.refreshToken,
          expiryDate: newTokens.expiry_date ? BigInt(newTokens.expiry_date) : connection.expiryDate,
        },
      });
    });

    return google.calendar({ version: "v3", auth: oauth2Client });
  }

  /**
   * Synchronizes newly created appointment to patient & doctor Google Calendars
   */
  static async syncAppointmentCreated(appointmentId: string) {
    try {
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          doctor: { include: { user: true, specialization: true } },
          patient: { include: { user: true } },
          symptomSubmission: true,
        },
      });

      if (!appt) return;

      const eventPayload = {
        summary: `Doctor Appointment: Dr. ${appt.doctor.user.name} with ${appt.patient.user.name}`,
        description: `Healthcare Appointment\nDoctor: Dr. ${appt.doctor.user.name} (${appt.doctor.specialization.name})\nPatient: ${appt.patient.user.name}\nChief Complaint: ${appt.symptomSubmission?.chiefComplaint || "General Consultation"}`,
        start: { dateTime: appt.startTime.toISOString() },
        end: { dateTime: appt.endTime.toISOString() },
      };

      // Patient Calendar
      const patientCal = await this.getAuthenticatedCalendar(appt.patient.userId);
      let patientEventId: string | null = null;
      if (patientCal) {
        try {
          const res = await patientCal.events.insert({
            calendarId: "primary",
            requestBody: eventPayload,
          });
          patientEventId = res.data.id || null;
        } catch (e: any) {
          console.error("Failed to insert patient calendar event:", e?.message);
        }
      }

      // Doctor Calendar
      const doctorCal = await this.getAuthenticatedCalendar(appt.doctor.userId);
      let doctorEventId: string | null = null;
      if (doctorCal) {
        try {
          const res = await doctorCal.events.insert({
            calendarId: "primary",
            requestBody: eventPayload,
          });
          doctorEventId = res.data.id || null;
        } catch (e: any) {
          console.error("Failed to insert doctor calendar event:", e?.message);
        }
      }

      if (patientEventId || doctorEventId) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            googleCalendarEventIdPatient: patientEventId,
            googleCalendarEventIdDoctor: doctorEventId,
          },
        });
      }
    } catch (err) {
      console.error("Google Calendar creation sync failed:", err);
    }
  }

  /**
   * Synchronizes rescheduled appointment to Google Calendars
   */
  static async syncAppointmentUpdated(appointmentId: string) {
    try {
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
        },
      });
      if (!appt) return;

      const updatePayload = {
        start: { dateTime: appt.startTime.toISOString() },
        end: { dateTime: appt.endTime.toISOString() },
      };

      if (appt.googleCalendarEventIdPatient) {
        const patientCal = await this.getAuthenticatedCalendar(appt.patient.userId);
        if (patientCal) {
          await patientCal.events.patch({
            calendarId: "primary",
            eventId: appt.googleCalendarEventIdPatient,
            requestBody: updatePayload,
          }).catch(console.error);
        }
      }

      if (appt.googleCalendarEventIdDoctor) {
        const doctorCal = await this.getAuthenticatedCalendar(appt.doctor.userId);
        if (doctorCal) {
          await doctorCal.events.patch({
            calendarId: "primary",
            eventId: appt.googleCalendarEventIdDoctor,
            requestBody: updatePayload,
          }).catch(console.error);
        }
      }
    } catch (err) {
      console.error("Google Calendar update sync failed:", err);
    }
  }

  /**
   * Deletes calendar events upon cancellation
   */
  static async syncAppointmentCancelled(appointmentId: string) {
    try {
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
        },
      });
      if (!appt) return;

      if (appt.googleCalendarEventIdPatient) {
        const patientCal = await this.getAuthenticatedCalendar(appt.patient.userId);
        if (patientCal) {
          await patientCal.events.delete({
            calendarId: "primary",
            eventId: appt.googleCalendarEventIdPatient,
          }).catch(console.error);
        }
      }

      if (appt.googleCalendarEventIdDoctor) {
        const doctorCal = await this.getAuthenticatedCalendar(appt.doctor.userId);
        if (doctorCal) {
          await doctorCal.events.delete({
            calendarId: "primary",
            eventId: appt.googleCalendarEventIdDoctor,
          }).catch(console.error);
        }
      }
    } catch (err) {
      console.error("Google Calendar cancellation sync failed:", err);
    }
  }
}
