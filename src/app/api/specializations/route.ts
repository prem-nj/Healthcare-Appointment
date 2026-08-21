import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { specializationSchema } from "@/validators";

export async function GET() {
  try {
    const specializations = await prisma.specialization.findMany({
      include: {
        _count: {
          select: { doctors: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return jsonSuccess({ specializations });
  } catch (err: any) {
    return jsonError(err?.message || "Failed to fetch specializations", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, ["ADMIN"]);
    const body = await req.json();
    const validated = specializationSchema.parse(body);

    const specialization = await prisma.specialization.create({
      data: {
        name: validated.name,
        description: validated.description || null,
      },
    });

    return jsonSuccess({ specialization }, 201);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (err?.name === "ZodError") return jsonError("Validation failed", 400, err.errors);
    return jsonError(err?.message || "Failed to create specialization", 500);
  }
}
