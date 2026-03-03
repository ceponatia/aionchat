import { PrismaPg } from "@prisma/adapter-pg";
import prismaClientPackage from "@prisma/client";

type PrismaClientInstance = {
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
};

type PrismaClientConstructor = new (options?: {
  adapter?: PrismaPg;
}) => PrismaClientInstance;

const { PrismaClient } = prismaClientPackage as {
  PrismaClient: PrismaClientConstructor;
};

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://aionchat:aionchat@localhost:5434/aionchat";

const adapter = new PrismaPg({ connectionString: databaseUrl });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientInstance | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
