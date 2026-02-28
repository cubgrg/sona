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

describe('Praise Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /praise', () => {
    it('should create praise with feed post', async () => {
      const mockPraiseResult = {
        id: 'praise-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Amazing teamwork today!',
        category: 'teamwork',
        feedPostId: 'fp-1',
        fromUser: { id: 'user-1', displayName: 'Maria Santos', avatarUrl: null },
        toUser: { id: 'user-2', displayName: 'James Chen', avatarUrl: null },
        feedPost: {
          id: 'fp-1',
          authorId: 'user-1',
          type: 'praise',
          content: 'Amazing teamwork today!',
          author: { id: 'user-1', displayName: 'Maria Santos', avatarUrl: null, role: 'manager' },
          reactions: [],
          praise: {
            fromUser: { id: 'user-1', displayName: 'Maria Santos', avatarUrl: null },
            toUser: { id: 'user-2', displayName: 'James Chen', avatarUrl: null },
          },
        },
      };

      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'user-2', displayName: 'James Chen' }) // recipient lookup
        .mockResolvedValueOnce({ id: 'user-1', displayName: 'Maria Santos', locationId: 'loc-1' }); // sender lookup

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue(mockPraiseResult);

      const res = await request(app)
        .post('/praise')
        .set('Authorization', authHeader())
        .send({ toUserId: 'user-2', message: 'Amazing teamwork today!', category: 'teamwork' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Amazing teamwork today!');
      expect(res.body.category).toBe('teamwork');
      expect(res.body.fromUser.displayName).toBe('Maria Santos');
      expect(res.body.toUser.displayName).toBe('James Chen');
    });

    it('should reject praising yourself', async () => {
      const res = await request(app)
        .post('/praise')
        .set('Authorization', authHeader())
        .send({ toUserId: 'user-1', message: 'I am the best!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot praise yourself');
    });

    it('should reject missing toUserId', async () => {
      const res = await request(app)
        .post('/praise')
        .set('Authorization', authHeader())
        .send({ message: 'Great job!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('toUserId and message are required');
    });

    it('should reject missing message', async () => {
      const res = await request(app)
        .post('/praise')
        .set('Authorization', authHeader())
        .send({ toUserId: 'user-2' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('toUserId and message are required');
    });

    it('should 404 for non-existent recipient', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/praise')
        .set('Authorization', authHeader())
        .send({ toUserId: 'fake-user', message: 'Great!' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Recipient not found');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/praise')
        .send({ toUserId: 'user-2', message: 'Nice!' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /praise/received', () => {
    it('should return praise received by current user', async () => {
      const mockPraises = [
        {
          id: 'praise-1',
          fromUserId: 'user-2',
          toUserId: 'user-1',
          message: 'You crushed it!',
          category: 'above_and_beyond',
          fromUser: { id: 'user-2', displayName: 'James Chen', avatarUrl: null },
          toUser: { id: 'user-1', displayName: 'Maria Santos', avatarUrl: null },
        },
      ];

      (mockPrisma.praise.findMany as jest.Mock).mockResolvedValue(mockPraises);

      const res = await request(app)
        .get('/praise/received')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].message).toBe('You crushed it!');
      expect(res.body[0].fromUser.displayName).toBe('James Chen');
    });

    it('should return empty array when no praise received', async () => {
      (mockPrisma.praise.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/praise/received')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('GET /praise/given', () => {
    it('should return praise given by current user', async () => {
      const mockPraises = [
        {
          id: 'praise-2',
          fromUserId: 'user-1',
          toUserId: 'user-3',
          message: 'Excellent service!',
          category: 'customer_service',
          fromUser: { id: 'user-1', displayName: 'Maria Santos', avatarUrl: null },
          toUser: { id: 'user-3', displayName: 'Sophie Williams', avatarUrl: null },
        },
      ];

      (mockPrisma.praise.findMany as jest.Mock).mockResolvedValue(mockPraises);

      const res = await request(app)
        .get('/praise/given')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].toUser.displayName).toBe('Sophie Williams');
    });
  });
});
