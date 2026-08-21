import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/validators";
import { verifyPassword, signToken } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });

    if (!user || !user.isActive) {
      return jsonError("Invalid email or password", 401);
    }

    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      return jsonError("Invalid email or password", 401);
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      patientProfileId: user.patientProfile?.id,
      doctorProfileId: user.doctorProfile?.id,
    });

    const response = jsonSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        patientProfileId: user.patientProfile?.id,
        doctorProfileId: user.doctorProfile?.id,
      },
      token,
    });

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
    console.error("Login error:", err);
    return jsonError(err?.message || "Internal server error", 500);
  }
}
