import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { LLMService } from "@/services/llm.service";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req, ["DOCTOR", "ADMIN"]);
    const { id } = await params;
    const { type } = await req.json(); // "PRE_VISIT" or "POST_VISIT"

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        symptomSubmission: true,
        consultation: true,
        prescription: { include: { medications: true } },
      },
    });

    if (!appointment) return jsonError("Appointment not found", 404);

    if (type === "PRE_VISIT" && appointment.symptomSubmission) {
      const res = await LLMService.generatePreVisitSummary({
        chiefComplaint: appointment.symptomSubmission.chiefComplaint,
        symptoms: appointment.symptomSubmission.symptoms,
        duration: appointment.symptomSubmission.duration,
        severity: appointment.symptomSubmission.severity,
        additionalNotes: appointment.symptomSubmission.additionalNotes,
      });

      const updated = await prisma.preVisitSummary.upsert({
        where: { appointmentId: id },
        create: {
          appointmentId: id,
          urgencyLevel: res.data.urgencyLevel,
          chiefComplaint: res.data.chiefComplaint,
          suggestedQuestions: res.data.suggestedQuestions,
          rawResponse: res.rawResponse || null,
          status: res.success ? "SUCCESS" : "FAILED",
          errorMessage: res.error || null,
        },
        update: {
          urgencyLevel: res.data.urgencyLevel,
          chiefComplaint: res.data.chiefComplaint,
          suggestedQuestions: res.data.suggestedQuestions,
          rawResponse: res.rawResponse || null,
          status: res.success ? "SUCCESS" : "FAILED",
          errorMessage: res.error || null,
        },
      });

      return jsonSuccess({ summary: updated });
    } else if (type === "POST_VISIT" && appointment.consultation) {
      const meds = appointment.prescription?.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
      }));

      const res = await LLMService.generatePostVisitSummary({
        clinicalNotes: appointment.consultation.clinicalNotes,
        diagnosis: appointment.consultation.diagnosis,
        followUpInstructions: appointment.consultation.followUpInstructions,
        medications: meds,
      });

      const updated = await prisma.postVisitSummary.upsert({
        where: { appointmentId: id },
        create: {
          appointmentId: id,
          patientFriendlySummary: res.data.patientFriendlySummary,
          medicationScheduleSummary: res.data.medicationScheduleSummary || null,
          followUpSteps: res.data.followUpSteps,
          status: res.success ? "SUCCESS" : "FAILED",
          errorMessage: res.error || null,
        },
        update: {
          patientFriendlySummary: res.data.patientFriendlySummary,
          medicationScheduleSummary: res.data.medicationScheduleSummary || null,
          followUpSteps: res.data.followUpSteps,
          status: res.success ? "SUCCESS" : "FAILED",
          errorMessage: res.error || null,
        },
      });

      return jsonSuccess({ summary: updated });
    }

    return jsonError("Invalid AI summary retry type or missing prerequisite data", 400);
  } catch (err: any) {
    return jsonError(err?.message || "Failed to retry AI summary", 500);
  }
}
