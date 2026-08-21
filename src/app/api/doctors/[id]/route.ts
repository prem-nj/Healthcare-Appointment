import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        specialization: true,
        workingHours: {
          orderBy: { dayOfWeek: "asc" },
        },
        leaves: {
          where: {
            status: "APPROVED",
            endDate: { gte: new Date() },
          },
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!doctor) {
      return jsonError("Doctor not found", 404);
    }

    return jsonSuccess({ doctor });
  } catch (err: any) {
    return jsonError(err?.message || "Failed to fetch doctor", 500);
  }
}
