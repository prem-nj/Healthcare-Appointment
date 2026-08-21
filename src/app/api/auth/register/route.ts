import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/validators";
import { hashPassword, signToken } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      return jsonError("A user with this email already exists", 409);
    }

    const hashedPassword = await hashPassword(validated.password);

    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          name: validated.name,
          email: validated.email.toLowerCase(),
          passwordHash: hashedPassword,
          phone: validated.phone || null,
          role: validated.role as Role,
        },
      });

      let patientProfileId: string | undefined;

      if (validated.role === "PATIENT") {
        const patient = await tx.patientProfile.create({
          data: { userId: newUser.id },
        });
        patientProfileId = patient.id;
      }

      return { ...newUser, patientProfileId };
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      patientProfileId: user.patientProfileId,
    });

    const response = jsonSuccess(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          patientProfileId: user.patientProfileId,
        },
        token,
      },
      201
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return jsonError("Validation failed", 400, err.errors);
    }
    console.error("Registration error:", err);
    return jsonError(err?.message || "Internal server error", 500);
  }
}
