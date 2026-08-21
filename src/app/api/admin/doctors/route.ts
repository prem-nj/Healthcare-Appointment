import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";
import { createDoctorSchema } from "@/validators";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, ["ADMIN"]);
    const doctors = await prisma.doctorProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
        specialization: true,
        workingHours: { orderBy: { dayOfWeek: "asc" } },
        leaves: { orderBy: { startDate: "desc" } },
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonSuccess({ doctors });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError(err?.message || "Failed to fetch doctors", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuth(req, ["ADMIN"]);
    const body = await req.json();
    const validated = createDoctorSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      return jsonError("User with this email already exists", 409);
    }

    const hashedPassword = await hashPassword(validated.password);

    const doctor = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name: validated.name,
          email: validated.email.toLowerCase(),
          passwordHash: hashedPassword,
          phone: validated.phone || null,
          role: "DOCTOR",
        },
      });

      const doctorProfile = await tx.doctorProfile.create({
        data: {
          userId: user.id,
          specializationId: validated.specializationId,
          licenseNumber: validated.licenseNumber || null,
          bio: validated.bio || null,
          consultationFee: validated.consultationFee,
          slotDurationMinutes: validated.slotDurationMinutes,
          isAcceptingAppointments: validated.isAcceptingAppointments,
        },
      });

      // Initialize default working hours Monday to Friday (day 1-5, 09:00 to 17:00)
      for (let day = 1; day <= 5; day++) {
        await tx.doctorWorkingHour.create({
          data: {
            doctorId: doctorProfile.id,
            dayOfWeek: day,
            startTime: "09:00",
            endTime: "17:00",
            isActive: true,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: admin.userId,
          action: "CREATE_DOCTOR",
          resourceType: "DOCTOR",
          resourceId: doctorProfile.id,
          details: { name: validated.name, email: validated.email },
        },
      });

      return { ...doctorProfile, user };
    });

    return jsonSuccess({ doctor }, 201);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (err?.name === "ZodError") return jsonError("Validation failed", 400, err.errors);
    return jsonError(err?.message || "Failed to create doctor", 500);
  }
}
