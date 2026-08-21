import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var pgPoolGlobal: pg.Pool | undefined;
}

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/healthcare_appointments?schema=public";

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  if (!global.prismaGlobal) {
    const pool = global.pgPoolGlobal ?? new pg.Pool({ connectionString });
    global.pgPoolGlobal = pool;
    const adapter = new PrismaPg(pool);
    global.prismaGlobal = new PrismaClient({ adapter });
  }
  return global.prismaGlobal;
}

export const prisma = getPrismaClient();
export default prisma;
