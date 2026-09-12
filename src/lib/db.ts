import { PrismaClient } from "@prisma/client";

// Netlify DB injects its Postgres connection string as NETLIFY_DB_URL rather
// than DATABASE_URL (which is what our Prisma schema reads), and only at
// runtime once the database is provisioned on deploy — so map it here.
if (!process.env.DATABASE_URL && process.env.NETLIFY_DB_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DB_URL;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
