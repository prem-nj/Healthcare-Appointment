import { prisma } from "@/lib/prisma";
import { AppointmentStatus, NotificationType } from "@prisma/client";
import { addMinutes, parseISO, isBefore } from "date-fns";
import { LLMService } from "./llm.service";
import { EmailService } from "./email.service";
import { GoogleCalendarService } from "./google-calendar.service";
import { SlotService } from "./slot.service";

export interface BookAppointmentInput {
  patientProfileId: string;
  userId: string;
  doctorId: string;
  startTime: string; // ISO string
  durationMinutes?: number;
  holdId?: string;
  symptoms: {
    chiefComplaint: string;
    symptoms: string;
    duration: string;
    severity: "Mild" | "Moderate" | "Severe";
    additionalNotes?: string;
  };
}

export class AppointmentService {
  /**
   * Validates valid status transitions in the state machine
   */
  static validateStatusTransition(currentStatus: AppointmentStatus, newStatus: AppointmentStatus) {
    const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      PENDING: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
      HELD: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
      CONFIRMED: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.CANCELLED_BY_DOCTOR,
        AppointmentStatus.CANCELLED_BY_LEAVE,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.RESCHEDULED,
      ],
      CANCELLED: [],
      CANCELLED_BY_DOCTOR: [],
      CANCELLED_BY_LEAVE: [],
      COMPLETED: [],
      NO_SHOW: [],
      RESCHEDULED: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid appointment status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Atomically books an appointment inside a database transaction with concurrency locking
   */
  static async bookAppointment(input: BookAppointmentInput) {
    const start = new Date(input.startTime);
    const now = new Date();

    if (isBefore(start, now)) {
      throw new Error("Cannot book an appointment in the past");
    }

    // Run database transaction
    const appointment = await prisma.$transaction(async (tx: any) => {
      // 1. Validate doctor exists, is active, and is accepting appointments
      const doctor = await tx.doctorProfile.findUnique({
        where: { id: input.doctorId },
        include: {
          user: true,
          specialization: true,
          workingHours: true,
          leaves: {
            where: { status: "APPROVED" },
          },
        },
      });

      if (!doctor || !doctor.user.isActive || !doctor.isAcceptingAppointments) {
        throw new Error("Doctor is not available for appointments");
      }

      const slotDuration = input.durationMinutes || doctor.slotDurationMinutes || 30;
      const end = addMinutes(start, slotDuration);

      // 2. Validate doctor working hours for this day
      const dayOfWeek = start.getUTCDay();
      const workingHour = doctor.workingHours.find(
        (wh: any) => wh.dayOfWeek === dayOfWeek && wh.isActive
      );

      if (!workingHour) {
        throw new Error("Doctor does not work on this day of the week");
      }

      const [wStartH, wStartM] = workingHour.startTime.split(":").map(Number);
      const [wEndH, wEndM] = workingHour.endTime.split(":").map(Number);

      const slotStartMinutes = start.getUTCHours() * 60 + start.getUTCMinutes();
      const slotEndMinutes = end.getUTCHours() * 60 + end.getUTCMinutes();
      const workStartMinutes = wStartH * 60 + wStartM;
      const workEndMinutes = wEndH * 60 + wEndM;

      if (slotStartMinutes < workStartMinutes || slotEndMinutes > workEndMinutes) {
        throw new Error("Requested appointment time falls outside doctor's working hours");
      }

      // 3. Validate doctor is not on leave
      const isOnLeave = doctor.leaves.some((leave: any) => {
        const lStart = new Date(leave.startDate);
        const lEnd = new Date(leave.endDate);
        return lStart <= end && lEnd >= start;
      });

      if (isOnLeave) {
        throw new Error("Doctor is on approved leave during this time");
      }

      // 4. Re-check for conflicting appointments inside transaction (CRITICAL FOR CONCURRENCY)
      const existingConflict = await tx.appointment.findFirst({
        where: {
          doctorId: input.doctorId,
          startTime: { lt: end },
          endTime: { gt: start },
          status: {
            in: [
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.PENDING,
              AppointmentStatus.HELD,
            ],
          },
        },
      });

      if (existingConflict) {
        throw new Error("SLOT_CONFLICT: This appointment slot has already been booked by another patient.");
      }

      // 5. Re-check slot holds
      const activeHoldByOther = await tx.slotHold.findFirst({
        where: {
          doctorId: input.doctorId,
          startTime: { lt: end },
          endTime: { gt: start },
          expiresAt: { gt: now },
          isReleased: false,
          patientId: { not: input.patientProfileId },
        },
      });

      if (activeHoldByOther) {
        throw new Error("SLOT_HELD: This slot is currently held by another patient. Please choose another time.");
      }

      // 6. Release any holds for this slot
      await tx.slotHold.updateMany({
        where: {
          doctorId: input.doctorId,
          patientId: input.patientProfileId,
          isReleased: false,
        },
        data: {
          isReleased: true,
        },
      });

      // 7. Create Appointment atomically
      const newAppt = await tx.appointment.create({
        data: {
          patientId: input.patientProfileId,
          doctorId: input.doctorId,
          startTime: start,
          endTime: end,
          status: AppointmentStatus.CONFIRMED,
        },
      });

      // 8. Create Symptom Submission
      await tx.symptomSubmission.create({
        data: {
          appointmentId: newAppt.id,
          chiefComplaint: input.symptoms.chiefComplaint,
          symptoms: input.symptoms.symptoms,
          duration: input.symptoms.duration,
          severity: input.symptoms.severity,
          additionalNotes: input.symptoms.additionalNotes || null,
        },
      });

      // 9. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: input.userId,
          action: "BOOK_APPOINTMENT",
          resourceType: "APPOINTMENT",
          resourceId: newAppt.id,
          details: {
            doctorId: input.doctorId,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            chiefComplaint: input.symptoms.chiefComplaint,
          },
        },
      });

      return newAppt;
    });

    // 10. Post-Transaction Non-Blocking Steps (LLM, Email, Google Calendar)
    // Run asynchronously without blocking HTTP response
    (async () => {
      try {
        // Fetch full appointment details with user emails
        const fullAppt = await prisma.appointment.findUnique({
          where: { id: appointment.id },
          include: {
            doctor: { include: { user: true, specialization: true } },
            patient: { include: { user: true } },
            symptomSubmission: true,
          },
        });

        if (!fullAppt) return;

        // A. Trigger Pre-visit AI Summary
        try {
          const aiResult = await LLMService.generatePreVisitSummary({
            chiefComplaint: input.symptoms.chiefComplaint,
            symptoms: input.symptoms.symptoms,
            duration: input.symptoms.duration,
            severity: input.symptoms.severity,
            additionalNotes: input.symptoms.additionalNotes,
          });

          await prisma.preVisitSummary.create({
            data: {
              appointmentId: appointment.id,
              urgencyLevel: aiResult.data.urgencyLevel,
              chiefComplaint: aiResult.data.chiefComplaint,
              suggestedQuestions: aiResult.data.suggestedQuestions,
              rawResponse: aiResult.rawResponse || null,
              status: aiResult.success ? "SUCCESS" : "FAILED",
              errorMessage: aiResult.error || null,
            },
          });
        } catch (aiErr) {
          console.error("Async Pre-visit AI trigger error:", aiErr);
        }

        // B. Send Email to Patient
        const formattedDate = start.toUTCString();
        await EmailService.sendNotification({
          userId: fullAppt.patient.userId,
          recipientEmail: fullAppt.patient.user.email,
          type: NotificationType.APPOINTMENT_CONFIRMATION,
          subject: `Appointment Confirmed with Dr. ${fullAppt.doctor.user.name}`,
          bodyText: `Hello ${fullAppt.patient.user.name},\n\nYour appointment with Dr. ${fullAppt.doctor.user.name} (${fullAppt.doctor.specialization.name}) is confirmed for ${formattedDate}.\n\nChief Complaint: ${input.symptoms.chiefComplaint}`,
          relatedEntityType: "APPOINTMENT",
          relatedEntityId: appointment.id,
          idempotencyKey: `appt_confirm_patient_${appointment.id}`,
        });

        // C. Send Email to Doctor
        await EmailService.sendNotification({
          userId: fullAppt.doctor.userId,
          recipientEmail: fullAppt.doctor.user.email,
          type: NotificationType.APPOINTMENT_CONFIRMATION,
          subject: `New Appointment: ${fullAppt.patient.user.name} on ${formattedDate}`,
          bodyText: `Dr. ${fullAppt.doctor.user.name},\n\nA new appointment has been scheduled by patient ${fullAppt.patient.user.name} for ${formattedDate}.\n\nChief Complaint: ${input.symptoms.chiefComplaint}\nUrgency: ${input.symptoms.severity}`,
          relatedEntityType: "APPOINTMENT",
          relatedEntityId: appointment.id,
          idempotencyKey: `appt_confirm_doctor_${appointment.id}`,
        });

        // D. Google Calendar Sync
        await GoogleCalendarService.syncAppointmentCreated(appointment.id);
      } catch (postErr) {
        console.error("Post-booking background processing failed:", postErr);
      }
    })();

    return appointment;
  }

  /**
   * Reschedules an appointment
   */
  static async rescheduleAppointment(
    appointmentId: string,
    newStartTime: string,
    userId: string,
    userRole: string,
    patientProfileId?: string,
    doctorProfileId?: string
  ) {
    const start = new Date(newStartTime);
    const now = new Date();

    if (isBefore(start, now)) {
      throw new Error("Cannot reschedule to a past time");
    }

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true, workingHours: true, leaves: { where: { status: "APPROVED" } } } },
        patient: { include: { user: true } },
      },
    });

    if (!appt) {
      throw new Error("Appointment not found");
    }

    if (userRole === "PATIENT" && appt.patientId !== patientProfileId) {
      throw new Error("Forbidden");
    }
    if (userRole === "DOCTOR" && appt.doctorId !== doctorProfileId) {
      throw new Error("Forbidden");
    }

    this.validateStatusTransition(appt.status, AppointmentStatus.RESCHEDULED);

    const slotDuration = appt.doctor.slotDurationMinutes || 30;
    const end = addMinutes(start, slotDuration);

    const updated = await prisma.$transaction(async (tx: any) => {
      // Check conflict
      const conflict = await tx.appointment.findFirst({
        where: {
          id: { not: appointmentId },
          doctorId: appt.doctorId,
          startTime: { lt: end },
          endTime: { gt: start },
          status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING, AppointmentStatus.HELD] },
        },
      });

      if (conflict) {
        throw new Error("Selected reschedule slot is already booked");
      }

      const res = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          startTime: start,
          endTime: end,
          status: AppointmentStatus.CONFIRMED,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "RESCHEDULE_APPOINTMENT",
          resourceType: "APPOINTMENT",
          resourceId: appointmentId,
          details: { oldStart: appt.startTime, newStart: start },
        },
      });

      return res;
    });

    // Notify patient and doctor & sync calendar
    (async () => {
      try {
        await EmailService.sendNotification({
          userId: appt.patient.userId,
          recipientEmail: appt.patient.user.email,
          type: NotificationType.APPOINTMENT_RESCHEDULED,
          subject: `Appointment Rescheduled: Dr. ${appt.doctor.user.name}`,
          bodyText: `Your appointment with Dr. ${appt.doctor.user.name} has been rescheduled to ${start.toUTCString()}.`,
          relatedEntityType: "APPOINTMENT",
          relatedEntityId: appointmentId,
        });

        await GoogleCalendarService.syncAppointmentUpdated(appointmentId);
      } catch (e) {
        console.error("Reschedule notification error:", e);
      }
    })();

    return updated;
  }

  /**
   * Cancels an appointment
   */
  static async cancelAppointment(
    appointmentId: string,
    reason: string,
    userId: string,
    userRole: string,
    patientProfileId?: string,
    doctorProfileId?: string
  ) {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    if (!appt) {
      throw new Error("Appointment not found");
    }

    if (userRole === "PATIENT" && appt.patientId !== patientProfileId) {
      throw new Error("Forbidden");
    }
    if (userRole === "DOCTOR" && appt.doctorId !== doctorProfileId) {
      throw new Error("Forbidden");
    }

    const newStatus =
      userRole === "DOCTOR"
        ? AppointmentStatus.CANCELLED_BY_DOCTOR
        : AppointmentStatus.CANCELLED;

    this.validateStatusTransition(appt.status, newStatus);

    const updated = await prisma.$transaction(async (tx: any) => {
      const res = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: newStatus,
          cancellationReason: reason,
          cancelledAt: new Date(),
          cancelledBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "CANCEL_APPOINTMENT",
          resourceType: "APPOINTMENT",
          resourceId: appointmentId,
          details: { reason, cancelledByRole: userRole },
        },
      });

      return res;
    });

    // Notify parties and delete calendar events
    (async () => {
      try {
        await EmailService.sendNotification({
          userId: appt.patient.userId,
          recipientEmail: appt.patient.user.email,
          type: NotificationType.APPOINTMENT_CANCELLED,
          subject: `Appointment Cancelled: Dr. ${appt.doctor.user.name}`,
          bodyText: `Your appointment with Dr. ${appt.doctor.user.name} on ${appt.startTime.toUTCString()} has been cancelled.\nReason: ${reason}`,
          relatedEntityType: "APPOINTMENT",
          relatedEntityId: appointmentId,
        });

        await GoogleCalendarService.syncAppointmentCancelled(appointmentId);
      } catch (e) {
        console.error("Cancel notification error:", e);
      }
    })();

    return updated;
  }
}
