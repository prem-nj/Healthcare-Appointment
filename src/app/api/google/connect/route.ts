import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { GoogleCalendarService } from "@/services/google-calendar.service";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const authUrl = GoogleCalendarService.getAuthorizationUrl(user.userId);

    if (!authUrl) {
      return jsonError("Google Calendar integration is not configured with client credentials", 400);
    }

    return jsonSuccess({ authUrl });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError(err?.message || "Failed to generate Google auth URL", 500);
  }
}
