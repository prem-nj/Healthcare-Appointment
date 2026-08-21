import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            specialization: true,
          },
        },
        patient: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        symptomSubmission: true,
        preVisitSummary: true,
        consultation: true,
        prescription: {
          include: {
            medications: true,
          },
        },
        postVisitSummary: true,
      },
    });

    if (!appointment) {
      return jsonError("Appointment not found", 404);
    }

    // Role security check
    if (user.role === "PATIENT" && appointment.patientId !== user.patientProfileId) {
      return jsonError("Forbidden", 403);
    }
    if (user.role === "DOCTOR" && appointment.doctorId !== user.doctorProfileId) {
      return jsonError("Forbidden", 403);
    }

    return jsonSuccess({ appointment });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError(err?.message || "Failed to fetch appointment", 500);
  }
}
