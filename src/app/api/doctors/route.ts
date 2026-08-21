import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const specializationId = searchParams.get("specializationId");

    const where: any = {
      user: {
        isActive: true,
      },
      isAcceptingAppointments: true,
    };

    if (specializationId) {
      where.specializationId = specializationId;
    }

    if (query.trim() !== "") {
      where.OR = [
        { user: { name: { contains: query, mode: "insensitive" } } },
        { bio: { contains: query, mode: "insensitive" } },
        { specialization: { name: { contains: query, mode: "insensitive" } } },
      ];
    }

    const doctors = await prisma.doctorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        specialization: true,
        workingHours: {
          where: { isActive: true },
          orderBy: { dayOfWeek: "asc" },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    return jsonSuccess({ doctors });
  } catch (err: any) {
    return jsonError(err?.message || "Failed to fetch doctors", 500);
  }
}
