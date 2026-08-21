import { prisma } from "@/lib/prisma";
import { ReminderStatus, NotificationType } from "@prisma/client";
import { EmailService } from "./email.service";
import { addDays, parseISO, isBefore } from "date-fns";

export class ReminderService {
  /**
   * Generates reminder records for a newly created medication based on its frequency
   */
  static async generateRemindersForMedication(
    medicationId: string,
    patientId: string,
    medication: {
      name: string;
      dosage: string;
      frequency: string;
      startDate: Date;
      endDate: Date;
    }
  ) {
    // Determine daily reminder hour offsets
    // once_daily: 09:00
    // twice_daily: 09:00, 21:00
    // three_times_daily: 08:00, 14:00, 20:00
    // four_times_daily: 08:00, 12:00, 16:00, 20:00
    let hours = [9]; // default 09:00 UTC

    switch (medication.frequency) {
      case "twice_daily":
        hours = [9, 21];
        break;
      case "three_times_daily":
        hours = [8, 14, 20];
        break;
      case "four_times_daily":
        hours = [8, 12, 16, 20];
        break;
      case "once_daily":
      default:
        hours = [9];
        break;
    }

    const remindersToCreate: Array<{
      medicationId: string;
      patientId: string;
      dueTime: Date;
      idempotencyKey: string;
      status: ReminderStatus;
    }> = [];

    const start = new Date(medication.startDate);
    const end = new Date(medication.endDate);

    let currentDate = new Date(start);

    while (currentDate <= end) {
      for (const h of hours) {
        const reminderTime = new Date(currentDate);
        reminderTime.setUTCHours(h, 0, 0, 0);

        const idempotencyKey = `rem_${medicationId}_${reminderTime.toISOString()}`;

        remindersToCreate.push({
          medicationId,
          patientId,
          dueTime: reminderTime,
          idempotencyKey,
          status: ReminderStatus.SCHEDULED,
        });
      }
      currentDate = addDays(currentDate, 1);
    }

    // Insert reminders safely with upsert / skipping duplicates
    for (const r of remindersToCreate) {
      try {
        await prisma.medicationReminder.upsert({
          where: { idempotencyKey: r.idempotencyKey },
          create: r,
          update: {},
        });
      } catch (e) {
        // Ignore duplicate error
      }
    }
  }

  /**
   * Processes all due medication reminders
   */
  static async processDueReminders(limit = 50) {
    const now = new Date();

    const dueReminders = await prisma.medicationReminder.findMany({
      where: {
        status: ReminderStatus.SCHEDULED,
        dueTime: { lte: now },
      },
      include: {
        medication: {
          include: {
            prescription: true,
          },
        },
        patient: {
          include: {
            user: true,
          },
        },
      },
      take: limit,
      orderBy: { dueTime: "asc" },
    });

    const results = [];

    for (const rem of dueReminders) {
      try {
        const medName = rem.medication.name;
        const dosage = rem.medication.dosage;
        const instructions = rem.medication.instructions || "as directed";

        await EmailService.sendNotification({
          userId: rem.patient.userId,
          recipientEmail: rem.patient.user.email,
          type: NotificationType.MEDICATION_REMINDER,
          subject: `Medication Reminder: ${medName} (${dosage})`,
          bodyText: `Hello ${rem.patient.user.name},\n\nThis is your scheduled reminder to take your medication:\n\n- Medication: ${medName}\n- Dosage: ${dosage}\n- Instructions: ${instructions}\n\nPlease mark it in your schedule once taken. Stay healthy!`,
          relatedEntityType: "MEDICATION_REMINDER",
          relatedEntityId: rem.id,
          idempotencyKey: `email_${rem.idempotencyKey}`,
        });

        await prisma.medicationReminder.update({
          where: { id: rem.id },
          data: {
            status: ReminderStatus.SENT,
            sentAt: new Date(),
          },
        });

        results.push({ id: rem.id, status: "SENT" });
      } catch (err: any) {
        console.error(`Failed to process reminder ${rem.id}:`, err);
        await prisma.medicationReminder.update({
          where: { id: rem.id },
          data: {
            status: ReminderStatus.FAILED,
            retryCount: { increment: 1 },
            lastError: err?.message || "Reminder dispatch failed",
          },
        });
        results.push({ id: rem.id, status: "FAILED", error: err?.message });
      }
    }

    return results;
  }
}
