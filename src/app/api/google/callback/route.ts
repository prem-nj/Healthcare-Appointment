import { NextRequest, NextResponse } from "next/server";
import { GoogleCalendarService } from "@/services/google-calendar.service";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  if (error || !code || !userId) {
    return NextResponse.redirect(`${appUrl}/dashboard?calendar_error=${error || "missing_code"}`);
  }

  try {
    await GoogleCalendarService.handleAuthCallback(code, userId);
    return NextResponse.redirect(`${appUrl}/dashboard?calendar_connected=true`);
  } catch (err: any) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${appUrl}/dashboard?calendar_error=exchange_failed`);
  }
}
