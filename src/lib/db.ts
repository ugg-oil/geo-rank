import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function isTransientPgError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /connection terminated|connection terminated unexpectedly|connection terminated due to connection timeout|client has encountered a connection error|cannot use a pool after calling end|econnreset|etimedout|epipe|the database system is starting up/i.test(
    message
  );
}

export async function withPgRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (i === attempts - 1 || !isTransientPgError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    }
  }
  throw last;
}

function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in environment (required for Prisma).");
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  pool.on("error", (error) => {
    console.error("[pg] idle client error:", error.message);
  });
  return pool;
}

function createPrismaClient() {
  const pool = globalForPrisma.pgPool ?? createPool();
  if (process.env.NODE_ENV !== "production") globalForPrisma.pgPool = pool;
  const adapter = new PrismaPg(pool, {
    onPoolError: (error) => {
      console.error("[pg] pool error:", error.message);
    },
    onConnectionError: (error) => {
      console.error("[pg] connection error:", error.message);
    },
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
