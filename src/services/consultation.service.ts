import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { LLMService } from "./llm.service";
import { ReminderService } from "./reminder.service";

export interface SubmitConsultationInput {
  appointmentId: string;
  doctorId: string; // DoctorProfileId
  patientId: string; // PatientProfileId
  clinicalNotes: string;
  diagnosis?: string;
  followUpInstructions?: string;
  recommendedFollowUpDate?: string;
  prescriptionNotes?: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    customFrequency?: string;
    duration: string;
    instructions?: string;
    startDate: string;
    endDate: string;
  }>;
}

export class ConsultationService {
  /**
   * Submits consultation notes and relational prescription, creates medication reminders,
   * marks appointment COMPLETED, and triggers asynchronous Post-visit AI summary.
   */
  static async submitConsultation(input: SubmitConsultationInput) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      include: { doctor: true, patient: true },
    });

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (appointment.doctorId !== input.doctorId) {
      throw new Error("Only the assigned doctor can submit consultation for this appointment");
    }

    // 1. Transactional Database Save
    const result = await prisma.$transaction(async (tx: any) => {
      // Upsert Consultation
      const consultation = await tx.consultation.upsert({
        where: { appointmentId: input.appointmentId },
        create: {
          appointmentId: input.appointmentId,
          doctorId: input.doctorId,
          patientId: input.patientId,
          clinicalNotes: input.clinicalNotes,
          diagnosis: input.diagnosis || null,
          followUpInstructions: input.followUpInstructions || null,
          recommendedFollowUpDate: input.recommendedFollowUpDate
            ? new Date(input.recommendedFollowUpDate)
            : null,
        },
        update: {
          clinicalNotes: input.clinicalNotes,
          diagnosis: input.diagnosis || null,
          followUpInstructions: input.followUpInstructions || null,
          recommendedFollowUpDate: input.recommendedFollowUpDate
            ? new Date(input.recommendedFollowUpDate)
            : null,
        },
      });

      // Upsert Prescription if medications or notes exist
      let prescription = null;
      if (input.prescriptionNotes || (input.medications && input.medications.length > 0)) {
        prescription = await tx.prescription.upsert({
          where: { appointmentId: input.appointmentId },
          create: {
            appointmentId: input.appointmentId,
            doctorId: input.doctorId,
            patientId: input.patientId,
            notes: input.prescriptionNotes || null,
          },
          update: {
            notes: input.prescriptionNotes || null,
          },
        });

        // Delete previous medications if updating
        await tx.medication.deleteMany({
          where: { prescriptionId: prescription.id },
        });

        // Insert new medications
        if (input.medications && input.medications.length > 0) {
          for (const med of input.medications) {
            await tx.medication.create({
              data: {
                prescriptionId: prescription.id,
                name: med.name,
                dosage: med.dosage,
                frequency: med.frequency,
                customFrequency: med.customFrequency || null,
                duration: med.duration,
                instructions: med.instructions || null,
                startDate: new Date(med.startDate),
                endDate: new Date(med.endDate),
              },
            });
          }
        }
      }

      // Mark appointment as COMPLETED
      await tx.appointment.update({
        where: { id: input.appointmentId },
        data: {
          status: AppointmentStatus.COMPLETED,
        },
      });

      return { consultation, prescription };
    });

    // 2. Post-Transaction Reminders Generation
    if (result.prescription) {
      const meds = await prisma.medication.findMany({
        where: { prescriptionId: result.prescription.id },
      });

      for (const med of meds) {
        await ReminderService.generateRemindersForMedication(
          med.id,
          input.patientId,
          {
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            startDate: med.startDate,
            endDate: med.endDate,
          }
        );
      }
    }

    // 3. Post-Transaction Non-Blocking AI Post-Visit Summary
    (async () => {
      try {
        const aiSummary = await LLMService.generatePostVisitSummary({
          clinicalNotes: input.clinicalNotes,
          diagnosis: input.diagnosis,
          followUpInstructions: input.followUpInstructions,
          medications: input.medications,
        });

        await prisma.postVisitSummary.upsert({
          where: { appointmentId: input.appointmentId },
          create: {
            appointmentId: input.appointmentId,
            patientFriendlySummary: aiSummary.data.patientFriendlySummary,
            medicationScheduleSummary: aiSummary.data.medicationScheduleSummary || null,
            followUpSteps: aiSummary.data.followUpSteps,
            status: aiSummary.success ? "SUCCESS" : "FAILED",
            errorMessage: aiSummary.error || null,
          },
          update: {
            patientFriendlySummary: aiSummary.data.patientFriendlySummary,
            medicationScheduleSummary: aiSummary.data.medicationScheduleSummary || null,
            followUpSteps: aiSummary.data.followUpSteps,
            status: aiSummary.success ? "SUCCESS" : "FAILED",
            errorMessage: aiSummary.error || null,
          },
        });
      } catch (err) {
        console.error("Async Post-visit AI generation failed:", err);
      }
    })();

    return result;
  }
}
