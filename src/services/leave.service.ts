import { prisma } from "@/lib/prisma";
import { AppointmentStatus, NotificationType, LeaveStatus } from "@prisma/client";
import { EmailService } from "./email.service";
import { GoogleCalendarService } from "./google-calendar.service";

export interface CreateLeaveInput {
  doctorId: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  reason?: string;
  adminUserId: string;
}

export class LeaveService {
  /**
   * Applies leave for a doctor and transactionally cancels any conflicting appointments
   */
  static async createDoctorLeave(input: CreateLeaveInput) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    if (end < start) {
      throw new Error("Leave end date cannot be before start date");
    }

    // 1. Transactional Leave Creation + Conflicted Appointment Cancellation
    const result = await prisma.$transaction(async (tx) => {
      // Create DoctorLeave record
      const leave = await tx.doctorLeave.create({
        data: {
          doctorId: input.doctorId,
          startDate: start,
          endDate: end,
          reason: input.reason || "Doctor on approved leave",
          status: LeaveStatus.APPROVED,
        },
      });

      // Find all affected appointments in this window
      const affectedAppointments = await tx.appointment.findMany({
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
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true, specialization: true } },
        },
      });

      // Transactionally cancel each affected appointment
      const updatedApptIds: string[] = [];
      for (const appt of affectedAppointments) {
        await tx.appointment.update({
          where: { id: appt.id },
          data: {
            status: AppointmentStatus.CANCELLED_BY_LEAVE,
            cancellationReason: `Doctor leave approved (${input.reason || "Scheduled Leave"})`,
            cancelledAt: new Date(),
            cancelledBy: input.adminUserId,
          },
        });
        updatedApptIds.push(appt.id);
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: input.adminUserId,
          action: "APPLY_DOCTOR_LEAVE",
          resourceType: "DOCTOR_LEAVE",
          resourceId: leave.id,
          details: {
            doctorId: input.doctorId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            affectedAppointmentsCount: affectedAppointments.length,
            affectedAppointmentIds: updatedApptIds,
            reason: input.reason,
          },
        },
      });

      return { leave, affectedAppointments };
    });

    // 2. Non-blocking Post-Transaction Notifications and Calendar Sync
    (async () => {
      for (const appt of result.affectedAppointments) {
        try {
          // Email to patient
          await EmailService.sendNotification({
            userId: appt.patient.userId,
            recipientEmail: appt.patient.user.email,
            type: NotificationType.APPOINTMENT_CANCELLED_BY_LEAVE,
            subject: `Important: Your Appointment with Dr. ${appt.doctor.user.name} has been cancelled`,
            bodyText: `Dear ${appt.patient.user.name},\n\nDue to unexpected doctor leave, your appointment scheduled for ${appt.startTime.toUTCString()} with Dr. ${appt.doctor.user.name} has been cancelled.\n\nWe sincerely apologize for the inconvenience. Please visit your patient dashboard to select another slot or book with another specialist.\n\nReason: ${input.reason || "Doctor on leave"}`,
            relatedEntityType: "APPOINTMENT",
            relatedEntityId: appt.id,
            idempotencyKey: `leave_cancel_notif_${appt.id}`,
          });

          // Delete Google Calendar events
          await GoogleCalendarService.syncAppointmentCancelled(appt.id);
        } catch (err) {
          console.error(`Failed to dispatch leave cancellation notification for appt ${appt.id}:`, err);
        }
      }
    })();

    return {
      leave: result.leave,
      affectedAppointmentsCount: result.affectedAppointments.length,
    };
  }

  /**
   * Cancels a doctor leave and logs audit
   */
  static async cancelDoctorLeave(leaveId: string, adminUserId: string) {
    const leave = await prisma.doctorLeave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new Error("Leave record not found");
    }

    const updated = await prisma.doctorLeave.update({
      where: { id: leaveId },
      data: { status: LeaveStatus.CANCELLED },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: "CANCEL_DOCTOR_LEAVE",
        resourceType: "DOCTOR_LEAVE",
        resourceId: leaveId,
        details: { doctorId: leave.doctorId },
      },
    });

    return updated;
  }
}
