import prismaClientPackage from "@prisma/client";

type PrismaClientInstance = {
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
};

type PrismaClientConstructor = new () => PrismaClientInstance;

const { PrismaClient } = prismaClientPackage as {
  PrismaClient: PrismaClientConstructor;
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientInstance | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
