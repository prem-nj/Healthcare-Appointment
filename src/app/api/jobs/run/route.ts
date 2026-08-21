import { NextRequest } from "next/server";
import { JobService } from "@/services/job.service";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.JOB_SECRET || "job-cron-secret-key-12345";
    const providedSecret = authHeader?.replace("Bearer ", "");

    // Either valid JOB_SECRET or authenticated ADMIN session
    let authorized = providedSecret === expectedSecret;
    if (!authorized) {
      const user = await getAuthenticatedUser(req);
      if (user && user.role === "ADMIN") {
        authorized = true;
      }
    }

    if (!authorized) {
      return jsonError("Unauthorized: valid JOB_SECRET or Admin login required", 401);
    }

    const results = await JobService.runAllJobs();
    return jsonSuccess({ message: "Background jobs executed successfully", results });
  } catch (err: any) {
    console.error("Job execution error:", err);
    return jsonError(err?.message || "Background job execution failed", 500);
  }
}
