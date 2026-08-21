import { SlotService } from "./slot.service";
import { ReminderService } from "./reminder.service";
import { EmailService } from "./email.service";
import { prisma } from "@/lib/prisma";
import { addHours, subMinutes } from "date-fns";
import { NotificationType } from "@prisma/client";

export class JobService {
  /**
   * Executes all background maintenance jobs (can be triggered by cron or scheduled API)
   */
  static async runAllJobs() {
    const results = {
      slotHoldsCleaned: 0,
      remindersProcessed: [] as any[],
      notificationsRetried: [] as any[],
      upcomingRemindersSent: 0,
    };

    // 1. Cleanup expired holds
    await SlotService.cleanupExpiredHolds();

    // 2. Process medication reminders
    results.remindersProcessed = await ReminderService.processDueReminders(50);

    // 3. Retry failed email notifications
    results.notificationsRetried = await EmailService.retryFailedNotifications(20);

    // 4. Send 24-hour upcoming appointment reminders
    const now = new Date();
    const targetStart = addHours(now, 23);
    const targetEnd = addHours(now, 25);

    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        startTime: { gte: targetStart, lte: targetEnd },
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialization: true } },
      },
    });

    for (const appt of upcomingAppointments) {
      const idempotencyKey = `appt_remind_24h_${appt.id}`;
      const sent = await EmailService.sendNotification({
        userId: appt.patient.userId,
        recipientEmail: appt.patient.user.email,
        type: NotificationType.APPOINTMENT_REMINDER,
        subject: `Reminder: Upcoming Appointment Tomorrow with Dr. ${appt.doctor.user.name}`,
        bodyText: `Hello ${appt.patient.user.name},\n\nThis is a friendly reminder of your appointment with Dr. ${appt.doctor.user.name} (${appt.doctor.specialization.name}) tomorrow at ${appt.startTime.toUTCString()}.\n\nPlease arrive 10 minutes early. If you need to reschedule, please visit your patient portal.`,
        relatedEntityType: "APPOINTMENT",
        relatedEntityId: appt.id,
        idempotencyKey,
      });

      if (sent.success) {
        results.upcomingRemindersSent++;
      }
    }

    return results;
  }
}
