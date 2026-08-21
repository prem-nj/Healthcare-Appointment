import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, ["ADMIN"]);

    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      appointmentsByStatus,
      notificationsByStatus,
      recentAuditLogs,
      activeSlotHolds,
    ] = await Promise.all([
      prisma.patientProfile.count(),
      prisma.doctorProfile.count(),
      prisma.appointment.count(),
      prisma.appointment.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.notification.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
      }),
      prisma.slotHold.count({
        where: {
          expiresAt: { gt: new Date() },
          isReleased: false,
        },
      }),
    ]);

    return jsonSuccess({
      stats: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        appointmentsByStatus,
        notificationsByStatus,
        activeSlotHolds,
      },
      recentAuditLogs,
    });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError(err?.message || "Failed to fetch admin stats", 500);
  }
}
