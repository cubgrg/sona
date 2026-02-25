import { mockPrisma } from './mocks/prisma';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../app';

// Set env vars for tests
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@team.com',
        passwordHash: 'hashed',
        displayName: 'Test User',
        avatarUrl: null,
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@team.com', password: 'password123', displayName: 'Test User' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('test@team.com');
      expect(res.body.user.displayName).toBe('Test User');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      // Verify the token is valid
      const decoded = jwt.verify(res.body.accessToken, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe('user-1');
    });

    it('should reject duplicate email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@team.com', password: 'password123', displayName: 'Test User' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123', displayName: 'Test User' });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@team.com', password: 'short', displayName: 'Test User' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('8 characters');
    });

    it('should reject missing displayName', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@team.com', password: 'password123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with correct credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      const mockUser = {
        id: 'user-1',
        email: 'test@team.com',
        passwordHash,
        displayName: 'Test User',
        avatarUrl: null,
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@team.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@team.com');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@team.com',
        passwordHash,
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@team.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@team.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should issue new tokens with valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { userId: 'user-1', email: 'test@team.com' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /health', () => {
    it('should return ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
