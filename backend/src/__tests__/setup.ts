import { mockDeep, mockReset, type DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../utils/prisma";

const prismaMocked = prisma as unknown as DeepMockProxy<PrismaClient>;

jest.mock("../utils/prisma", () => ({
  prisma: mockDeep<PrismaClient>()
}));

beforeEach((): void => {
  mockReset(prismaMocked);
});

export { prismaMocked };
