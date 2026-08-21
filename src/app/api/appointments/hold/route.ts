import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { slotHoldSchema } from "@/validators";
import { SlotService } from "@/services/slot.service";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["PATIENT"]);
    if (!user.patientProfileId) {
      return jsonError("Patient profile required", 400);
    }

    const body = await req.json();
    const validated = slotHoldSchema.parse(body);

    const hold = await SlotService.createSlotHold(
      validated.doctorId,
      user.patientProfileId,
      validated.startTime,
      validated.durationMinutes || 30
    );

    return jsonSuccess({ hold }, 201);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (err?.name === "ZodError") return jsonError("Validation failed", 400, err.errors);
    return jsonError(err?.message || "Failed to hold slot", 409);
  }
}
