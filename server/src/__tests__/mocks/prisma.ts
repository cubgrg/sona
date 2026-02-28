import { PrismaClient } from '@prisma/client';

// Deep mock of PrismaClient for tests
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  channel: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  channelMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  message: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  conversation: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  conversationMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  readReceipt: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  shift: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  feedPost: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  feedReaction: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  praise: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  payPeriod: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  location: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as jest.Mocked<PrismaClient>;

jest.mock('../../lib/prisma', () => ({
  prisma: mockPrisma,
}));

export { mockPrisma };
