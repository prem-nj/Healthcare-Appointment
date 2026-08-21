import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["PATIENT"]);
    if (!user.patientProfileId) {
      return jsonError("Patient profile required", 400);
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: user.patientProfileId },
      include: {
        doctor: {
          include: {
            user: { select: { name: true } },
            specialization: true,
          },
        },
        appointment: true,
        medications: {
          include: {
            reminders: {
              where: { dueTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
              orderBy: { dueTime: "asc" },
              take: 10,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const upcomingReminders = await prisma.medicationReminder.findMany({
      where: {
        patientId: user.patientProfileId,
        dueTime: { gte: new Date() },
      },
      include: {
        medication: true,
      },
      orderBy: { dueTime: "asc" },
      take: 20,
    });

    return jsonSuccess({ prescriptions, upcomingReminders });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError(err?.message || "Failed to fetch medications", 500);
  }
}
