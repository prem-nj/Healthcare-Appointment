import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationStatus } from "@prisma/client";

export class EmailService {
  private static getTransporter() {
    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT) || 587;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;

    if (!host || !user || !pass || host.includes("mailtrap.io") && user === "your-smtp-username") {
      // Return a simulated transporter for dev/testing
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Dispatches email or queues notification record with idempotency and retry handling.
   */
  static async sendNotification(params: {
    userId?: string;
    recipientEmail: string;
    type: NotificationType;
    subject: string;
    bodyText: string;
    bodyHtml?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; notificationId: string; error?: string }> {
    // 1. Check idempotency
    if (params.idempotencyKey) {
      const existing = await prisma.notification.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existing && existing.status === NotificationStatus.SENT) {
        return { success: true, notificationId: existing.id };
      }
    }

    // 2. Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        recipientEmail: params.recipientEmail,
        type: params.type,
        subject: params.subject,
        bodyText: params.bodyText,
        bodyHtml: params.bodyHtml || `<p>${params.bodyText}</p>`,
        status: NotificationStatus.PENDING,
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
        idempotencyKey: params.idempotencyKey,
      },
    });

    const transporter = this.getTransporter();
    const fromAddress = process.env.EMAIL_FROM || "Healthcare Clinic <no-reply@healthcare-clinic.com>";

    if (!transporter) {
      // Development mock: log to stdout and mark as SENT
      console.log(`[EMAIL DISPATCH - SIMULATED]
To: ${params.recipientEmail}
Subject: ${params.subject}
Body: ${params.bodyText}
----------------------------------------`);

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });

      return { success: true, notificationId: notification.id };
    }

    try {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENDING },
      });

      await transporter.sendMail({
        from: fromAddress,
        to: params.recipientEmail,
        subject: params.subject,
        text: params.bodyText,
        html: params.bodyHtml || `<p>${params.bodyText}</p>`,
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });

      return { success: true, notificationId: notification.id };
    } catch (err: any) {
      console.error("Email send failed:", err?.message || err);

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          retryCount: { increment: 1 },
          lastError: err?.message || "Failed to send email",
        },
      });

      return { success: false, notificationId: notification.id, error: err?.message };
    }
  }

  /**
   * Retries failed notifications
   */
  static async retryFailedNotifications(maxToRetry = 20) {
    const failed = await prisma.notification.findMany({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: { lt: 3 },
      },
      take: maxToRetry,
      orderBy: { updatedAt: "asc" },
    });

    const results = [];
    const transporter = this.getTransporter();
    const fromAddress = process.env.EMAIL_FROM || "Healthcare Clinic <no-reply@healthcare-clinic.com>";

    for (const notif of failed) {
      if (!transporter) {
        await prisma.notification.update({
          where: { id: notif.id },
          data: { status: NotificationStatus.SENT, sentAt: new Date() },
        });
        results.push({ id: notif.id, status: "SENT_SIMULATED" });
        continue;
      }

      try {
        await transporter.sendMail({
          from: fromAddress,
          to: notif.recipientEmail,
          subject: notif.subject,
          text: notif.bodyText,
          html: notif.bodyHtml || `<p>${notif.bodyText}</p>`,
        });

        await prisma.notification.update({
          where: { id: notif.id },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          },
        });
        results.push({ id: notif.id, status: "SENT" });
      } catch (err: any) {
        await prisma.notification.update({
          where: { id: notif.id },
          data: {
            retryCount: { increment: 1 },
            lastError: err?.message || "Retry failed",
          },
        });
        results.push({ id: notif.id, status: "FAILED", error: err?.message });
      }
    }

    return results;
  }
}
