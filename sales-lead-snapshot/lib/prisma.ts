import { PrismaClient } from "@prisma/client";

type GlobalPrisma = { prisma?: PrismaClient };

const globalForPrisma = globalThis as typeof globalThis & GlobalPrisma;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
