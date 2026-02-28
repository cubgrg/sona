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

const mockAuthor = { id: 'user-1', displayName: 'Maria Santos', avatarUrl: null, role: 'manager' };

describe('Feed Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /feed', () => {
    it('should return feed posts', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          authorId: 'user-1',
          type: 'announcement',
          title: 'New Menu',
          content: 'Summer menu is live!',
          imageUrl: null,
          locationScope: 'all',
          isPinned: false,
          createdAt: new Date(),
          author: mockAuthor,
          reactions: [],
          praise: null,
        },
      ];

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ locationId: 'loc-1' });
      (mockPrisma.feedPost.findMany as jest.Mock).mockResolvedValue(mockPosts);

      const res = await request(app)
        .get('/feed?scope=all&limit=20')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('New Menu');
      expect(res.body[0].type).toBe('announcement');
    });

    it('should filter by my-location scope', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ locationId: 'loc-1' });
      (mockPrisma.feedPost.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/feed?scope=my-location')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      // Verify the where clause included OR for location filtering
      const findManyCall = (mockPrisma.feedPost.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toEqual([
        { locationScope: 'all' },
        { locationScope: 'loc-1' },
      ]);
    });

    it('should support cursor-based pagination', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ locationId: null });
      (mockPrisma.feedPost.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/feed?scope=all&cursor=post-10&limit=5')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      const findManyCall = (mockPrisma.feedPost.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.take).toBe(5);
      expect(findManyCall.skip).toBe(1);
      expect(findManyCall.cursor).toEqual({ id: 'post-10' });
    });

    it('should cap limit at 50', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ locationId: null });
      (mockPrisma.feedPost.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/feed?limit=100')
        .set('Authorization', authHeader());

      const findManyCall = (mockPrisma.feedPost.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.take).toBe(50);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/feed');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /feed', () => {
    it('should allow manager to create announcement', async () => {
      const mockPost = {
        id: 'post-new',
        authorId: 'user-1',
        type: 'announcement',
        title: 'Team Update',
        content: 'Meeting at 3pm',
        imageUrl: null,
        locationScope: 'all',
        isPinned: false,
        createdAt: new Date(),
        author: mockAuthor,
        reactions: [],
        praise: null,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'manager' });
      (mockPrisma.feedPost.create as jest.Mock).mockResolvedValue(mockPost);

      const res = await request(app)
        .post('/feed')
        .set('Authorization', authHeader())
        .send({ type: 'announcement', title: 'Team Update', content: 'Meeting at 3pm' });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('announcement');
      expect(res.body.content).toBe('Meeting at 3pm');
    });

    it('should reject non-manager creating announcement', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'server' });

      const res = await request(app)
        .post('/feed')
        .set('Authorization', authHeader())
        .send({ type: 'announcement', content: 'Not allowed' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Only managers can create this post type');
    });

    it('should allow any user to create praise post', async () => {
      const mockPost = {
        id: 'post-praise',
        authorId: 'user-2',
        type: 'praise',
        content: 'Great job today!',
        author: { id: 'user-2', displayName: 'Sophie', avatarUrl: null, role: 'server' },
        reactions: [],
        praise: null,
      };

      (mockPrisma.feedPost.create as jest.Mock).mockResolvedValue(mockPost);

      const res = await request(app)
        .post('/feed')
        .set('Authorization', authHeader('user-2'))
        .send({ type: 'praise', content: 'Great job today!' });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('praise');
    });

    it('should reject empty content', async () => {
      const res = await request(app)
        .post('/feed')
        .set('Authorization', authHeader())
        .send({ type: 'announcement' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Content is required');
    });
  });

  describe('GET /feed/:id', () => {
    it('should return a single post', async () => {
      const mockPost = {
        id: 'post-1',
        authorId: 'user-1',
        type: 'announcement',
        title: 'Test',
        content: 'Hello',
        author: mockAuthor,
        reactions: [],
        praise: null,
      };

      (mockPrisma.feedPost.findUnique as jest.Mock).mockResolvedValue(mockPost);

      const res = await request(app)
        .get('/feed/post-1')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('post-1');
    });

    it('should 404 for non-existent post', async () => {
      (mockPrisma.feedPost.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/feed/fake-id')
        .set('Authorization', authHeader());

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Post not found');
    });
  });

  describe('DELETE /feed/:id', () => {
    it('should allow author to delete own post', async () => {
      (mockPrisma.feedPost.findUnique as jest.Mock).mockResolvedValue({ authorId: 'user-1' });
      (mockPrisma.feedPost.delete as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete('/feed/post-1')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('should reject deleting another user\'s post', async () => {
      (mockPrisma.feedPost.findUnique as jest.Mock).mockResolvedValue({ authorId: 'user-2' });

      const res = await request(app)
        .delete('/feed/post-1')
        .set('Authorization', authHeader());

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not authorized');
    });

    it('should 404 for non-existent post', async () => {
      (mockPrisma.feedPost.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete('/feed/fake-id')
        .set('Authorization', authHeader());

      expect(res.status).toBe(404);
    });
  });

  describe('POST /feed/:id/reactions', () => {
    it('should add a new reaction', async () => {
      const mockReactions = [
        { id: 'r-1', emoji: '👍', userId: 'user-1', feedPostId: 'post-1', user: { id: 'user-1', displayName: 'Maria' } },
      ];

      (mockPrisma.feedPost.findUnique as jest.Mock).mockResolvedValue({ id: 'post-1' });
      (mockPrisma.feedReaction.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.feedReaction.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.feedReaction.findMany as jest.Mock).mockResolvedValue(mockReactions);

      const res = await request(app)
        .post('/feed/post-1/reactions')
        .set('Authorization', authHeader())
        .send({ emoji: '👍' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].emoji).toBe('👍');
    });

    it('should toggle off existing reaction', async () => {
      const existingReaction = { id: 'r-1', emoji: '👍', userId: 'user-1', feedPostId: 'post-1' };

      (mockPrisma.feedPost.findUnique as jest.Mock).mockResolvedValue({ id: 'post-1' });
      (mockPrisma.feedReaction.findUnique as jest.Mock).mockResolvedValue(existingReaction);
      (mockPrisma.feedReaction.delete as jest.Mock).mockResolvedValue({});
      (mockPrisma.feedReaction.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .post('/feed/post-1/reactions')
        .set('Authorization', authHeader())
        .send({ emoji: '👍' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
      expect(mockPrisma.feedReaction.delete).toHaveBeenCalledWith({ where: { id: 'r-1' } });
    });

    it('should reject missing emoji', async () => {
      const res = await request(app)
        .post('/feed/post-1/reactions')
        .set('Authorization', authHeader())
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Emoji is required');
    });

    it('should 404 for non-existent post', async () => {
      (mockPrisma.feedPost.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/feed/fake-id/reactions')
        .set('Authorization', authHeader())
        .send({ emoji: '👍' });

      expect(res.status).toBe(404);
    });
  });
});
