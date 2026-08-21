import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { doctorLeaveSchema } from "@/validators";
import { LeaveService } from "@/services/leave.service";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth(req, ["ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const validated = doctorLeaveSchema.parse(body);

    const result = await LeaveService.createDoctorLeave({
      doctorId: id,
      startDate: validated.startDate,
      endDate: validated.endDate,
      reason: validated.reason,
      adminUserId: admin.userId,
    });

    return jsonSuccess(result, 201);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (err?.name === "ZodError") return jsonError("Validation failed", 400, err.errors);
    return jsonError(err?.message || "Failed to create doctor leave", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth(req, ["ADMIN"]);
    const leaveId = req.nextUrl.searchParams.get("leaveId");
    if (!leaveId) return jsonError("leaveId query parameter is required", 400);

    const updated = await LeaveService.cancelDoctorLeave(leaveId, admin.userId);
    return jsonSuccess({ leave: updated });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    return jsonError(err?.message || "Failed to cancel leave", 500);
  }
}
