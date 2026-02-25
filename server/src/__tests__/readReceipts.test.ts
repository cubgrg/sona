import { mockPrisma } from './mocks/prisma';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

function authHeader(userId = 'user-1', email = 'test@team.com') {
  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '15m' });
  return `Bearer ${token}`;
}

describe('Read Receipt Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /read', () => {
    it('should mark a channel as read', async () => {
      (mockPrisma.readReceipt.upsert as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/read')
        .set('Authorization', authHeader())
        .send({ channelId: 'ch-1', lastReadMessageId: 'msg-5' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(mockPrisma.readReceipt.upsert).toHaveBeenCalledWith({
        where: { userId_channelId: { userId: 'user-1', channelId: 'ch-1' } },
        update: { lastReadMessageId: 'msg-5' },
        create: { userId: 'user-1', channelId: 'ch-1', lastReadMessageId: 'msg-5' },
      });
    });

    it('should mark a conversation as read', async () => {
      (mockPrisma.readReceipt.upsert as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/read')
        .set('Authorization', authHeader())
        .send({ conversationId: 'conv-1', lastReadMessageId: 'msg-10' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(mockPrisma.readReceipt.upsert).toHaveBeenCalledWith({
        where: { userId_conversationId: { userId: 'user-1', conversationId: 'conv-1' } },
        update: { lastReadMessageId: 'msg-10' },
        create: { userId: 'user-1', conversationId: 'conv-1', lastReadMessageId: 'msg-10' },
      });
    });

    it('should reject missing lastReadMessageId', async () => {
      const res = await request(app)
        .post('/read')
        .set('Authorization', authHeader())
        .send({ channelId: 'ch-1' });

      expect(res.status).toBe(400);
    });

    it('should reject missing channelId and conversationId', async () => {
      const res = await request(app)
        .post('/read')
        .set('Authorization', authHeader())
        .send({ lastReadMessageId: 'msg-5' });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/read')
        .send({ channelId: 'ch-1', lastReadMessageId: 'msg-5' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /unread', () => {
    it('should return unread counts', async () => {
      // User is in one channel and one conversation
      (mockPrisma.channelMember.findMany as jest.Mock).mockResolvedValue([
        { channelId: 'ch-1' },
      ]);
      (mockPrisma.conversationMember.findMany as jest.Mock).mockResolvedValue([
        { conversationId: 'conv-1' },
      ]);

      // No read receipts = all messages are unread
      (mockPrisma.readReceipt.findMany as jest.Mock).mockResolvedValue([]);

      // 3 unread in channel, 1 in conversation
      (mockPrisma.message.count as jest.Mock)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/unread')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body['ch-1']).toBe(3);
      expect(res.body['conv-1']).toBe(1);
    });

    it('should return empty when all read', async () => {
      (mockPrisma.channelMember.findMany as jest.Mock).mockResolvedValue([
        { channelId: 'ch-1' },
      ]);
      (mockPrisma.conversationMember.findMany as jest.Mock).mockResolvedValue([]);

      // Has a read receipt
      (mockPrisma.readReceipt.findMany as jest.Mock).mockResolvedValue([
        { userId: 'user-1', channelId: 'ch-1', conversationId: null, lastReadMessageId: 'msg-5' },
      ]);

      // Last read message exists
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({
        createdAt: new Date(),
      });

      // 0 messages after last read
      (mockPrisma.message.count as jest.Mock).mockResolvedValue(0);

      const res = await request(app)
        .get('/unread')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(Object.keys(res.body)).toHaveLength(0);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/unread');
      expect(res.status).toBe(401);
    });
  });
});
