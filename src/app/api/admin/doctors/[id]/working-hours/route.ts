import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { batchWorkingHoursSchema } from "@/validators";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth(req, ["ADMIN", "DOCTOR"]);
    const { id } = await params;

    // Doctor can only edit their own working hours unless admin
    if (admin.role === "DOCTOR" && admin.doctorProfileId !== id) {
      return jsonError("Forbidden", 403);
    }

    const body = await req.json();
    const validated = batchWorkingHoursSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      for (const wh of validated.workingHours) {
        await tx.doctorWorkingHour.upsert({
          where: {
            doctorId_dayOfWeek: {
              doctorId: id,
              dayOfWeek: wh.dayOfWeek,
            },
          },
          create: {
            doctorId: id,
            dayOfWeek: wh.dayOfWeek,
            startTime: wh.startTime,
            endTime: wh.endTime,
            isActive: wh.isActive,
          },
          update: {
            startTime: wh.startTime,
            endTime: wh.endTime,
            isActive: wh.isActive,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: admin.userId,
          action: "UPDATE_WORKING_HOURS",
          resourceType: "DOCTOR",
          resourceId: id,
          details: validated,
        },
      });
    });

    const updatedHours = await prisma.doctorWorkingHour.findMany({
      where: { doctorId: id },
      orderBy: { dayOfWeek: "asc" },
    });

    return jsonSuccess({ workingHours: updatedHours });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (err?.name === "ZodError") return jsonError("Validation failed", 400, err.errors);
    return jsonError(err?.message || "Failed to update working hours", 500);
  }
}
