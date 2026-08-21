import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { consultationSchema } from "@/validators";
import { ConsultationService } from "@/services/consultation.service";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req, ["DOCTOR"]);
    if (!user.doctorProfileId) {
      return jsonError("Doctor profile required", 400);
    }

    const { id } = await params;
    const body = await req.json();
    const validated = consultationSchema.parse(body);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return jsonError("Appointment not found", 404);
    }

    if (appointment.doctorId !== user.doctorProfileId) {
      return jsonError("Forbidden: only the assigned doctor can submit consultation", 403);
    }

    const result = await ConsultationService.submitConsultation({
      appointmentId: id,
      doctorId: user.doctorProfileId,
      patientId: appointment.patientId,
      clinicalNotes: validated.clinicalNotes,
      diagnosis: validated.diagnosis,
      followUpInstructions: validated.followUpInstructions,
      recommendedFollowUpDate: validated.recommendedFollowUpDate,
      prescriptionNotes: validated.prescriptionNotes,
      medications: validated.medications,
    });

    return jsonSuccess({ result }, 201);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (err?.name === "ZodError") return jsonError("Validation failed", 400, err.errors);
    console.error("Consultation submit error:", err);
    return jsonError(err?.message || "Failed to submit consultation", 400);
  }
}
