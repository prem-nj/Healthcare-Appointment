import { NextRequest } from "next/server";
import { SlotService } from "@/services/slot.service";
import { getAuthenticatedUser } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const date = req.nextUrl.searchParams.get("date"); // "YYYY-MM-DD"

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return jsonError("Valid date query parameter required in YYYY-MM-DD format", 400);
    }

    const session = await getAuthenticatedUser(req);
    const slots = await SlotService.getDoctorAvailableSlots(
      id,
      date,
      session?.patientProfileId
    );

    return jsonSuccess({ slots, date, doctorId: id });
  } catch (err: any) {
    console.error("Availability error:", err);
    return jsonError(err?.message || "Failed to fetch doctor availability", 500);
  }
}
