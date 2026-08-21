import { prisma } from "@/lib/prisma";
import { addMinutes, format, isBefore, parseISO, startOfDay, endOfDay } from "date-fns";

export interface AvailableSlot {
  startTime: string; // ISO string
  endTime: string;   // ISO string
  timeString: string; // "09:00 - 09:30"
  isAvailable: boolean;
  reason?: string;
}

export class SlotService {
  /**
   * Cleans up expired slot holds
   */
  static async cleanupExpiredHolds() {
    try {
      await prisma.slotHold.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isReleased: false,
        },
        data: {
          isReleased: true,
        },
      });
    } catch (e) {
      console.error("Failed to cleanup expired holds:", e);
    }
  }

  /**
   * Retrieves all available appointment slots for a doctor on a specific date (YYYY-MM-DD)
   */
  static async getDoctorAvailableSlots(
    doctorId: string,
    dateString: string, // "YYYY-MM-DD"
    excludePatientId?: string
  ): Promise<AvailableSlot[]> {
    await this.cleanupExpiredHolds();

    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: {
        workingHours: true,
        leaves: {
          where: {
            status: "APPROVED",
          },
        },
      },
    });

    if (!doctor || !doctor.isAcceptingAppointments) {
      return [];
    }

    const targetDate = parseISO(`${dateString}T00:00:00.000Z`);
    const dayOfWeek = targetDate.getUTCDay(); // 0-6

    // 1. Check working hours for this day of week
    const workingHour = doctor.workingHours.find(
      (wh: any) => wh.dayOfWeek === dayOfWeek && wh.isActive
    );

    if (!workingHour) {
      return [];
    }

    // 2. Check doctor leaves
    const queryStart = startOfDay(targetDate);
    const queryEnd = endOfDay(targetDate);

    const isOnLeave = doctor.leaves.some((leave: any) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      return leaveStart <= queryEnd && leaveEnd >= queryStart;
    });

    if (isOnLeave) {
      return [];
    }

    // 3. Fetch existing confirmed/held/pending appointments for this date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        startTime: { gte: queryStart, lte: queryEnd },
        status: {
          in: ["CONFIRMED", "PENDING", "HELD"],
        },
      },
    });

    // 4. Fetch active slot holds
    const now = new Date();
    const activeHolds = await prisma.slotHold.findMany({
      where: {
        doctorId,
        startTime: { gte: queryStart, lte: queryEnd },
        expiresAt: { gt: now },
        isReleased: false,
      },
    });

    // 5. Generate slots across working hours
    const slotDuration = doctor.slotDurationMinutes || 30;
    const [startHour, startMin] = workingHour.startTime.split(":").map(Number);
    const [endHour, endMin] = workingHour.endTime.split(":").map(Number);

    const slots: AvailableSlot[] = [];

    const slotStart = new Date(targetDate);
    slotStart.setUTCHours(startHour, startMin, 0, 0);

    const workingDayEnd = new Date(targetDate);
    workingDayEnd.setUTCHours(endHour, endMin, 0, 0);

    let currentSlotStart = new Date(slotStart);

    while (currentSlotStart < workingDayEnd) {
      const currentSlotEnd = addMinutes(currentSlotStart, slotDuration);
      if (currentSlotEnd > workingDayEnd) break;

      const isPast = isBefore(currentSlotStart, now);

      // Check overlapping appointment
      const isBooked = existingAppointments.some((appt: any) => {
        return (
          (currentSlotStart >= appt.startTime && currentSlotStart < appt.endTime) ||
          (currentSlotEnd > appt.startTime && currentSlotEnd <= appt.endTime) ||
          (currentSlotStart <= appt.startTime && currentSlotEnd >= appt.endTime)
        );
      });

      // Check overlapping active hold
      const isHeld = activeHolds.some((hold: any) => {
        if (excludePatientId && hold.patientId === excludePatientId) {
          return false; // Patient holds this slot themselves
        }
        return (
          (currentSlotStart >= hold.startTime && currentSlotStart < hold.endTime) ||
          (currentSlotEnd > hold.startTime && currentSlotEnd <= hold.endTime) ||
          (currentSlotStart <= hold.startTime && currentSlotEnd >= hold.endTime)
        );
      });

      let isAvailable = !isPast && !isBooked && !isHeld;
      let reason: string | undefined;

      if (isPast) {
        reason = "Past time";
      } else if (isBooked) {
        reason = "Already booked";
      } else if (isHeld) {
        reason = "Temporarily on hold";
      }

      slots.push({
        startTime: currentSlotStart.toISOString(),
        endTime: currentSlotEnd.toISOString(),
        timeString: `${format(currentSlotStart, "HH:mm")} - ${format(currentSlotEnd, "HH:mm")}`,
        isAvailable,
        reason,
      });

      currentSlotStart = currentSlotEnd;
    }

    return slots;
  }

  /**
   * Creates a 5-minute temporary slot hold
   */
  static async createSlotHold(
    doctorId: string,
    patientId: string,
    startTime: string,
    durationMinutes = 30
  ) {
    await this.cleanupExpiredHolds();

    const start = new Date(startTime);
    const end = addMinutes(start, durationMinutes);
    const now = new Date();

    if (isBefore(start, now)) {
      throw new Error("Cannot hold a slot in the past");
    }

    // Check if appointment exists
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId,
        startTime: { lt: end },
        endTime: { gt: start },
        status: { in: ["CONFIRMED", "PENDING", "HELD"] },
      },
    });

    if (existing) {
      throw new Error("Slot is already booked");
    }

    // Check if someone else has an active hold
    const existingHold = await prisma.slotHold.findFirst({
      where: {
        doctorId,
        startTime: { lt: end },
        endTime: { gt: start },
        expiresAt: { gt: now },
        isReleased: false,
        patientId: { not: patientId },
      },
    });

    if (existingHold) {
      throw new Error("Slot is currently held by another patient");
    }

    // Release any previous holds by this patient for this slot
    await prisma.slotHold.updateMany({
      where: {
        doctorId,
        patientId,
        isReleased: false,
      },
      data: {
        isReleased: true,
      },
    });

    // 5 minutes expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const hold = await prisma.slotHold.create({
      data: {
        doctorId,
        patientId,
        startTime: start,
        endTime: end,
        expiresAt,
      },
    });

    return hold;
  }
}
