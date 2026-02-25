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

const mockConversation = {
  id: 'conv-1',
  createdAt: new Date(),
  members: [
    { userId: 'user-1', user: { id: 'user-1', displayName: 'Alice', avatarUrl: null, status: 'online' } },
    { userId: 'user-2', user: { id: 'user-2', displayName: 'Bob', avatarUrl: null, status: 'offline' } },
  ],
};

describe('Conversation Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /conversations', () => {
    it('should list user conversations', async () => {
      (mockPrisma.conversation.findMany as jest.Mock).mockResolvedValue([mockConversation]);

      const res = await request(app)
        .get('/conversations')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('conv-1');
      expect(res.body[0].members).toHaveLength(2);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/conversations');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /conversations', () => {
    it('should create a new conversation', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-2' });
      (mockPrisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.conversation.create as jest.Mock).mockResolvedValue(mockConversation);

      const res = await request(app)
        .post('/conversations')
        .set('Authorization', authHeader())
        .send({ recipientId: 'user-2' });

      expect(res.status).toBe(201);
      expect(res.body.members).toHaveLength(2);
    });

    it('should return existing conversation if one exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-2' });
      (mockPrisma.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);

      const res = await request(app)
        .post('/conversations')
        .set('Authorization', authHeader())
        .send({ recipientId: 'user-2' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('conv-1');
      // Should not have called create
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should reject missing recipientId', async () => {
      const res = await request(app)
        .post('/conversations')
        .set('Authorization', authHeader())
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('recipientId is required');
    });

    it('should reject conversation with yourself', async () => {
      const res = await request(app)
        .post('/conversations')
        .set('Authorization', authHeader('user-1'))
        .send({ recipientId: 'user-1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot start a conversation with yourself');
    });

    it('should 404 for non-existent recipient', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/conversations')
        .set('Authorization', authHeader())
        .send({ recipientId: 'ghost' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });
  });

  describe('GET /conversations/:id', () => {
    it('should return conversation details', async () => {
      (mockPrisma.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);

      const res = await request(app)
        .get('/conversations/conv-1')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('conv-1');
    });

    it('should 404 if user is not a member', async () => {
      (mockPrisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/conversations/conv-999')
        .set('Authorization', authHeader());

      expect(res.status).toBe(404);
    });
  });

  describe('GET /conversations/:id/messages', () => {
    it('should return conversation messages', async () => {
      (mockPrisma.conversationMember.findUnique as jest.Mock).mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
      });

      const mockMessages = [
        { id: 'msg-1', content: 'Hey!', authorId: 'user-1', author: { id: 'user-1', displayName: 'Alice', avatarUrl: null } },
        { id: 'msg-2', content: 'Hi!', authorId: 'user-2', author: { id: 'user-2', displayName: 'Bob', avatarUrl: null } },
      ];
      (mockPrisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const res = await request(app)
        .get('/conversations/conv-1/messages')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should 403 if not a member', async () => {
      (mockPrisma.conversationMember.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/conversations/conv-1/messages')
        .set('Authorization', authHeader());

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not a member of this conversation');
    });
  });
});
