import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedUser(req);
    if (!session) {
      return jsonError("Unauthenticated", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        patientProfile: true,
        doctorProfile: {
          include: {
            specialization: true,
            workingHours: true,
          },
        },
        googleCalendarConnection: {
          select: {
            id: true,
            email: true,
            syncEnabled: true,
            lastSyncStatus: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return jsonError("User not found or inactive", 404);
    }

    const { passwordHash, ...userSafe } = user;
    return jsonSuccess({ user: userSafe });
  } catch (err: any) {
    return jsonError(err?.message || "Internal server error", 500);
  }
}
