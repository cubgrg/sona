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

describe('Shift Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /shifts/me/next', () => {
    it('should return next upcoming shift', async () => {
      const mockShift = {
        id: 'shift-1',
        employeeId: 'user-1',
        locationId: 'loc-1',
        date: new Date('2026-03-02'),
        startTime: '09:00',
        endTime: '17:00',
        role: 'server',
        notes: null,
        location: { id: 'loc-1', name: 'Downtown', address: '123 Main St' },
      };

      (mockPrisma.shift.findFirst as jest.Mock).mockResolvedValue(mockShift);

      const res = await request(app)
        .get('/shifts/me/next')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.startTime).toBe('09:00');
      expect(res.body.endTime).toBe('17:00');
      expect(res.body.role).toBe('server');
      expect(res.body.location.name).toBe('Downtown');
    });

    it('should return null when no upcoming shifts', async () => {
      (mockPrisma.shift.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/shifts/me/next')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/shifts/me/next');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /shifts/me/week', () => {
    it('should return current week shifts', async () => {
      const mockShifts = [
        {
          id: 'shift-1',
          employeeId: 'user-1',
          date: new Date('2026-03-02'),
          startTime: '09:00',
          endTime: '17:00',
          role: 'server',
          location: { id: 'loc-1', name: 'Downtown' },
        },
        {
          id: 'shift-2',
          employeeId: 'user-1',
          date: new Date('2026-03-04'),
          startTime: '16:00',
          endTime: '23:00',
          role: 'server',
          location: { id: 'loc-1', name: 'Downtown' },
        },
      ];

      (mockPrisma.shift.findMany as jest.Mock).mockResolvedValue(mockShifts);

      const res = await request(app)
        .get('/shifts/me/week')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].startTime).toBe('09:00');
      expect(res.body[1].startTime).toBe('16:00');
    });

    it('should return empty array when no shifts this week', async () => {
      (mockPrisma.shift.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/shifts/me/week')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('GET /shifts/me', () => {
    it('should return all shifts for the user', async () => {
      const mockShifts = [
        {
          id: 'shift-1',
          employeeId: 'user-1',
          date: new Date('2026-03-01'),
          startTime: '09:00',
          endTime: '17:00',
          role: 'server',
          location: { id: 'loc-1', name: 'Downtown' },
        },
      ];

      (mockPrisma.shift.findMany as jest.Mock).mockResolvedValue(mockShifts);

      const res = await request(app)
        .get('/shifts/me')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should filter by date range', async () => {
      (mockPrisma.shift.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/shifts/me?from=2026-03-01&to=2026-03-07')
        .set('Authorization', authHeader());

      const findManyCall = (mockPrisma.shift.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.employeeId).toBe('user-1');
      expect(findManyCall.where.date).toBeDefined();
      expect(findManyCall.where.date.gte).toBeInstanceOf(Date);
      expect(findManyCall.where.date.lte).toBeInstanceOf(Date);
    });

    it('should filter with only from date', async () => {
      (mockPrisma.shift.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/shifts/me?from=2026-03-01')
        .set('Authorization', authHeader());

      const findManyCall = (mockPrisma.shift.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.date.gte).toBeInstanceOf(Date);
      expect(findManyCall.where.date.lte).toBeUndefined();
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/shifts/me');
      expect(res.status).toBe(401);
    });
  });
});
