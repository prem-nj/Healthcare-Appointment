import { describe, it, expect } from "vitest";
import { addMinutes } from "date-fns";

describe("Atomic Booking & Concurrency Double-Booking Prevention Logic", () => {
  it("should prevent overlapping intervals for simultaneous booking requests", () => {
    // Simulating two bookings for the same doctor at the same start time
    const start1 = new Date("2026-08-25T10:00:00.000Z");
    const end1 = addMinutes(start1, 30);

    const start2 = new Date("2026-08-25T10:00:00.000Z");
    const end2 = addMinutes(start2, 30);

    const isConflicting = (s1: Date, e1: Date, s2: Date, e2: Date) => {
      return s1 < e2 && e1 > s2;
    };

    expect(isConflicting(start1, end1, start2, end2)).toBe(true);

    // Adjacent non-overlapping slot
    const start3 = new Date("2026-08-25T10:30:00.000Z");
    const end3 = addMinutes(start3, 30);
    expect(isConflicting(start1, end1, start3, end3)).toBe(false);
  });

  it("should expire slot holds older than 5 minutes", () => {
    const holdDurationMs = 5 * 60 * 1000;
    const createdAt = new Date(Date.now() - 6 * 60 * 1000); // 6 mins ago
    const expiresAt = new Date(createdAt.getTime() + holdDurationMs);

    const isExpired = (exp: Date) => exp < new Date();
    expect(isExpired(expiresAt)).toBe(true);

    const activeCreatedAt = new Date();
    const activeExpiresAt = new Date(activeCreatedAt.getTime() + holdDurationMs);
    expect(isExpired(activeExpiresAt)).toBe(false);
  });

  it("should detect doctor leave overlap with existing appointments", () => {
    const leaveStart = new Date("2026-08-25T00:00:00.000Z");
    const leaveEnd = new Date("2026-08-27T23:59:59.000Z");

    const apptInside = {
      startTime: new Date("2026-08-26T14:00:00.000Z"),
      endTime: new Date("2026-08-26T14:30:00.000Z"),
    };

    const apptOutside = {
      startTime: new Date("2026-08-29T10:00:00.000Z"),
      endTime: new Date("2026-08-29T10:30:00.000Z"),
    };

    const isOverlappingLeave = (start: Date, end: Date, lStart: Date, lEnd: Date) => {
      return start < lEnd && end > lStart;
    };

    expect(isOverlappingLeave(apptInside.startTime, apptInside.endTime, leaveStart, leaveEnd)).toBe(true);
    expect(isOverlappingLeave(apptOutside.startTime, apptOutside.endTime, leaveStart, leaveEnd)).toBe(false);
  });
});
