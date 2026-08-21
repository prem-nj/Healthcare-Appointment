import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret-at-least-32-chars-long-test-key-12345"
);

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  patientProfileId?: string;
  doctorProfileId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyJwtToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;
    return await verifyJwtToken(token);
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(request?: NextRequest): Promise<TokenPayload | null> {
  let token: string | undefined;

  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = request.cookies.get("auth_token")?.value;
    }
  }

  if (!token) {
    return getSessionFromCookies();
  }

  return verifyJwtToken(token);
}

export async function requireAuth(request?: NextRequest, allowedRoles?: Role[]): Promise<TokenPayload> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
