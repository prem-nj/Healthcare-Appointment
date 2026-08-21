import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { updateDoctorSchema } from "@/validators";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth(req, ["ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const validated = updateDoctorSchema.parse(body);

    const existingDoctor = await prisma.doctorProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingDoctor) return jsonError("Doctor not found", 404);

    const updated = await prisma.$transaction(async (tx: any) => {
      if (validated.name || validated.phone || validated.isActive !== undefined) {
        await tx.user.update({
          where: { id: existingDoctor.userId },
          data: {
            name: validated.name,
            phone: validated.phone,
            isActive: validated.isActive,
          },
        });
      }

      const doc = await tx.doctorProfile.update({
        where: { id },
        data: {
          specializationId: validated.specializationId,
          licenseNumber: validated.licenseNumber,
          bio: validated.bio,
          consultationFee: validated.consultationFee,
          slotDurationMinutes: validated.slotDurationMinutes,
          isAcceptingAppointments: validated.isAcceptingAppointments,
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
          specialization: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.userId,
          action: "UPDATE_DOCTOR",
          resourceType: "DOCTOR",
          resourceId: id,
          details: body,
        },
      });

      return doc;
    });

    return jsonSuccess({ doctor: updated });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (err?.name === "ZodError") return jsonError("Validation failed", 400, err.errors);
    return jsonError(err?.message || "Failed to update doctor", 500);
  }
}
