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

describe('Channel Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /channels', () => {
    it('should return user channels', async () => {
      const mockChannels = [
        { id: 'ch-1', name: 'general', description: null, isPrivate: false, _count: { members: 3 } },
        { id: 'ch-2', name: 'design', description: 'Design talk', isPrivate: false, _count: { members: 2 } },
      ];

      (mockPrisma.channel.findMany as jest.Mock).mockResolvedValue(mockChannels);

      const res = await request(app)
        .get('/channels')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('general');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/channels');
      expect(res.status).toBe(401);
    });

    it('should reject invalid tokens', async () => {
      const res = await request(app)
        .get('/channels')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /channels', () => {
    it('should create a channel', async () => {
      const mockChannel = {
        id: 'ch-new',
        name: 'new-channel',
        description: 'A new channel',
        isPrivate: false,
        createdBy: 'user-1',
        _count: { members: 1 },
      };

      (mockPrisma.channel.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.channel.create as jest.Mock).mockResolvedValue(mockChannel);

      const res = await request(app)
        .post('/channels')
        .set('Authorization', authHeader())
        .send({ name: 'new-channel', description: 'A new channel' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('new-channel');
    });

    it('should reject duplicate channel names', async () => {
      (mockPrisma.channel.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      const res = await request(app)
        .post('/channels')
        .set('Authorization', authHeader())
        .send({ name: 'existing-channel' });

      expect(res.status).toBe(409);
    });

    it('should reject invalid channel names', async () => {
      const res = await request(app)
        .post('/channels')
        .set('Authorization', authHeader())
        .send({ name: 'Invalid Name!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('lowercase alphanumeric');
    });

    it('should reject empty channel names', async () => {
      const res = await request(app)
        .post('/channels')
        .set('Authorization', authHeader())
        .send({ name: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /channels/:id/join', () => {
    it('should join a channel', async () => {
      (mockPrisma.channel.findUnique as jest.Mock).mockResolvedValue({ id: 'ch-1' });
      (mockPrisma.channelMember.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.channelMember.create as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/channels/ch-1/join')
        .set('Authorization', authHeader());

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Joined channel');
    });

    it('should handle already a member', async () => {
      (mockPrisma.channel.findUnique as jest.Mock).mockResolvedValue({ id: 'ch-1' });
      (mockPrisma.channelMember.findUnique as jest.Mock).mockResolvedValue({ userId: 'user-1' });

      const res = await request(app)
        .post('/channels/ch-1/join')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Already a member');
    });

    it('should 404 for non-existent channel', async () => {
      (mockPrisma.channel.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/channels/fake-id/join')
        .set('Authorization', authHeader());

      expect(res.status).toBe(404);
    });
  });

  describe('POST /channels/:id/leave', () => {
    it('should leave a channel', async () => {
      (mockPrisma.channelMember.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/channels/ch-1/leave')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Left channel');
    });
  });
});
