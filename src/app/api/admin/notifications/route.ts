import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { NotificationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, ["ADMIN"]);
    const status = req.nextUrl.searchParams.get("status") as NotificationStatus | null;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return jsonSuccess({ notifications });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError(err?.message || "Failed to fetch notifications", 500);
  }
}
