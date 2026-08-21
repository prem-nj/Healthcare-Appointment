import { NextResponse } from "next/server";
import { jsonSuccess } from "@/lib/api-response";

export async function POST() {
  const response = jsonSuccess({ message: "Logged out successfully" });
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
