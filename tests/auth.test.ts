import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signToken, verifyJwtToken } from "@/lib/auth";
import { Role } from "@prisma/client";

describe("Authentication & RBAC Security Suite", () => {
  it("should securely hash and verify passwords using bcrypt", async () => {
    const password = "SecureMedicalPassword@123";
    const hashed = await hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(hashed.startsWith("$2a$") || hashed.startsWith("$2b$")).toBe(true);

    const isMatch = await verifyPassword(password, hashed);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword("WrongPassword", hashed);
    expect(isWrongMatch).toBe(false);
  });

  it("should generate and verify valid signed JWT session tokens", async () => {
    const payload = {
      userId: "user-12345",
      email: "doctor@healthcare.com",
      role: Role.DOCTOR,
      name: "Dr. Sarah Jenkins",
      doctorProfileId: "doc-profile-999",
    };

    const token = await signToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const verified = await verifyJwtToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.role).toBe(Role.DOCTOR);
    expect(verified?.doctorProfileId).toBe(payload.doctorProfileId);
  });

  it("should reject tampered or invalid JWT tokens", async () => {
    const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload";
    const result = await verifyJwtToken(invalidToken);
    expect(result).toBeNull();
  });
});
