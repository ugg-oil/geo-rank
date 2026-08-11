import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in environment (required for Prisma).");
  }
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

function hasLeadDelegate(client: PrismaClient) {
  const lead = (client as unknown as { lead?: { count?: unknown } }).lead;
  return typeof lead?.count === "function";
}

function getPrismaClient() {
  const existing = globalForPrisma.prisma;
  if (existing && hasLeadDelegate(existing)) return existing;
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

export const prisma = getPrismaClient();
