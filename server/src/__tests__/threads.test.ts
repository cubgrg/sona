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

const mockAuthor = { id: 'user-1', displayName: 'Test User', avatarUrl: null };

describe('Thread Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /messages/:id/thread', () => {
    it('should return parent message and thread replies', async () => {
      const parentMessage = {
        id: 'msg-1',
        content: 'Parent message',
        authorId: 'user-1',
        channelId: 'ch-1',
        conversationId: null,
        threadParentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: null,
        author: mockAuthor,
        _count: { threadReplies: 2 },
      };

      const replies = [
        {
          id: 'reply-1',
          content: 'First reply',
          authorId: 'user-2',
          channelId: 'ch-1',
          conversationId: null,
          threadParentId: 'msg-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          editedAt: null,
          author: { id: 'user-2', displayName: 'User Two', avatarUrl: null },
        },
        {
          id: 'reply-2',
          content: 'Second reply',
          authorId: 'user-1',
          channelId: 'ch-1',
          conversationId: null,
          threadParentId: 'msg-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          editedAt: null,
          author: mockAuthor,
        },
      ];

      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue(parentMessage);
      (mockPrisma.message.findMany as jest.Mock).mockResolvedValue(replies);

      const res = await request(app)
        .get('/messages/msg-1/thread')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.parent.id).toBe('msg-1');
      expect(res.body.parent._count.threadReplies).toBe(2);
      expect(res.body.replies).toHaveLength(2);
      expect(res.body.replies[0].content).toBe('First reply');
      expect(res.body.replies[1].content).toBe('Second reply');
    });

    it('should return empty replies for message with no thread', async () => {
      const parentMessage = {
        id: 'msg-1',
        content: 'Standalone message',
        authorId: 'user-1',
        channelId: 'ch-1',
        conversationId: null,
        threadParentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: null,
        author: mockAuthor,
        _count: { threadReplies: 0 },
      };

      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue(parentMessage);
      (mockPrisma.message.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/messages/msg-1/thread')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.parent.id).toBe('msg-1');
      expect(res.body.replies).toHaveLength(0);
    });

    it('should return 404 for non-existent message', async () => {
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/messages/fake-id/thread')
        .set('Authorization', authHeader());

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Message not found');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/messages/msg-1/thread');
      expect(res.status).toBe(401);
    });

    it('should reject invalid tokens', async () => {
      const res = await request(app)
        .get('/messages/msg-1/thread')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });
});
