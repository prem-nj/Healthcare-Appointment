import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { patientProfileSchema } from "@/validators";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["PATIENT"]);
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: user.userId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
    });
    return jsonSuccess({ profile });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError(err?.message || "Failed to fetch profile", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["PATIENT"]);
    const body = await req.json();
    const validated = patientProfileSchema.parse(body);

    const updated = await prisma.patientProfile.upsert({
      where: { userId: user.userId },
      create: {
        userId: user.userId,
        dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
        gender: validated.gender || null,
        bloodGroup: validated.bloodGroup || null,
        allergies: validated.allergies || null,
        emergencyContact: validated.emergencyContact || null,
        address: validated.address || null,
      },
      update: {
        dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : undefined,
        gender: validated.gender || undefined,
        bloodGroup: validated.bloodGroup || undefined,
        allergies: validated.allergies || undefined,
        emergencyContact: validated.emergencyContact || undefined,
        address: validated.address || undefined,
      },
    });

    return jsonSuccess({ profile: updated });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.name === "ZodError") return jsonError("Validation failed", 400, err.errors);
    return jsonError(err?.message || "Failed to update profile", 500);
  }
}
