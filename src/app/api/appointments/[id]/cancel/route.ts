import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { cancelAppointmentSchema } from "@/validators";
import { AppointmentService } from "@/services/appointment.service";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const validated = cancelAppointmentSchema.parse(body);

    const appointment = await AppointmentService.cancelAppointment(
      id,
      validated.reason,
      user.userId,
      user.role,
      user.patientProfileId,
      user.doctorProfileId
    );

    return jsonSuccess({ appointment });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (err?.name === "ZodError") return jsonError("Validation failed", 400, err.errors);
    return jsonError(err?.message || "Failed to cancel appointment", 400);
  }
}
