import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { EmailService } from "@/services/email.service";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { NotificationStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req, ["ADMIN"]);
    const { id } = await params;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return jsonError("Notification not found", 404);

    const result = await EmailService.sendNotification({
      userId: notif.userId || undefined,
      recipientEmail: notif.recipientEmail,
      type: notif.type,
      subject: notif.subject,
      bodyText: notif.bodyText,
      bodyHtml: notif.bodyHtml || undefined,
      relatedEntityType: notif.relatedEntityType || undefined,
      relatedEntityId: notif.relatedEntityId || undefined,
    });

    return jsonSuccess({ result });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError(err?.message || "Failed to retry notification", 500);
  }
}
