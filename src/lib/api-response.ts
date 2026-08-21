import { NextResponse } from "next/server";

export function jsonSuccess<T>(data: T, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status, headers }
  );
}

export function jsonError(
  message: string,
  status = 400,
  errors?: unknown,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        details: errors || undefined,
      },
    },
    { status, headers }
  );
}
