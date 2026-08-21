import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await prisma.googleCalendarConnection.deleteMany({
      where: { userId: user.userId },
    });
    return jsonSuccess({ message: "Google Calendar disconnected successfully" });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError(err?.message || "Failed to disconnect Google Calendar", 500);
  }
}
