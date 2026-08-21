import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { createMockPrismaClient } from "./db-store";

declare global {
  // eslint-disable-next-line no-var
  var __prismaInstance: any | undefined;
}

function getDatabaseClient(): any {
  if (global.__prismaInstance) {
    return global.__prismaInstance;
  }

  const databaseUrl = process.env.DATABASE_URL || "";
  const isCloudPostgres =
    databaseUrl.includes("neon.tech") ||
    databaseUrl.includes("supabase.co") ||
    databaseUrl.includes("render.com") ||
    databaseUrl.includes("aws") ||
    (databaseUrl.startsWith("postgresql://") && !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1"));

  if (isCloudPostgres) {
    try {
      const pool = new pg.Pool({ connectionString: databaseUrl });
      const adapter = new PrismaPg(pool);
      const client = new PrismaClient({ adapter });
      global.__prismaInstance = client;
      return client;
    } catch (e) {
      console.warn("Failed to connect to cloud PostgreSQL, falling back to embedded store:", e);
    }
  }

  // Self-contained embedded fallback for zero-config local development and testing
  const mockClient = createMockPrismaClient();
  global.__prismaInstance = mockClient;
  return mockClient;
}

export const prisma = getDatabaseClient();
export default prisma;
