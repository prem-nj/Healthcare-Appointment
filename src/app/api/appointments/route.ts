import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { bookAppointmentSchema } from "@/validators";
import { AppointmentService } from "@/services/appointment.service";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { AppointmentStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["PATIENT"]);
    if (!user.patientProfileId) {
      return jsonError("Patient profile required to book an appointment", 400);
    }

    const body = await req.json();
    const validated = bookAppointmentSchema.parse(body);

    const appointment = await AppointmentService.bookAppointment({
      patientProfileId: user.patientProfileId,
      userId: user.userId,
      doctorId: validated.doctorId,
      startTime: validated.startTime,
      holdId: validated.holdId,
      symptoms: validated.symptoms,
    });

    return jsonSuccess({ appointment }, 201);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (err?.name === "ZodError") return jsonError("Validation failed", 400, err.errors);

    if (err?.message?.includes("SLOT_CONFLICT") || err?.message?.includes("SLOT_HELD")) {
      return jsonError(err.message, 409);
    }

    console.error("Booking error:", err);
    return jsonError(err?.message || "Failed to book appointment", 400);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") as AppointmentStatus | null;
    const query = searchParams.get("q") || "";

    const where: any = {};

    if (user.role === "PATIENT") {
      where.patientId = user.patientProfileId;
    } else if (user.role === "DOCTOR") {
      where.doctorId = user.doctorProfileId;
    }

    if (status) {
      where.status = status;
    }

    if (query.trim() !== "") {
      where.OR = [
        { doctor: { user: { name: { contains: query, mode: "insensitive" } } } },
        { patient: { user: { name: { contains: query, mode: "insensitive" } } } },
        { symptomSubmission: { chiefComplaint: { contains: query, mode: "insensitive" } } },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        doctor: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
            specialization: true,
          },
        },
        patient: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        symptomSubmission: true,
        preVisitSummary: true,
        consultation: true,
        prescription: {
          include: {
            medications: true,
          },
        },
        postVisitSummary: true,
      },
      orderBy: { startTime: "desc" },
    });

    return jsonSuccess({ appointments });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    return jsonError(err?.message || "Failed to fetch appointments", 500);
  }
}
