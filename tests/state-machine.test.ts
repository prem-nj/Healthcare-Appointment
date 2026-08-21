import { describe, it, expect } from "vitest";
import { AppointmentService } from "@/services/appointment.service";
import { AppointmentStatus } from "@prisma/client";

describe("Appointment State Machine & Status Transition Suite", () => {
  it("should permit valid status transitions", () => {
    expect(() =>
      AppointmentService.validateStatusTransition(
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED
      )
    ).not.toThrow();

    expect(() =>
      AppointmentService.validateStatusTransition(
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED
      )
    ).not.toThrow();

    expect(() =>
      AppointmentService.validateStatusTransition(
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.RESCHEDULED
      )
    ).not.toThrow();

    expect(() =>
      AppointmentService.validateStatusTransition(
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED_BY_LEAVE
      )
    ).not.toThrow();
  });

  it("should reject invalid status transitions", () => {
    // Cannot complete a cancelled appointment
    expect(() =>
      AppointmentService.validateStatusTransition(
        AppointmentStatus.CANCELLED,
        AppointmentStatus.COMPLETED
      )
    ).toThrow(/Invalid appointment status transition/);

    // Cannot reschedule a completed appointment
    expect(() =>
      AppointmentService.validateStatusTransition(
        AppointmentStatus.COMPLETED,
        AppointmentStatus.RESCHEDULED
      )
    ).toThrow(/Invalid appointment status transition/);
  });
});
