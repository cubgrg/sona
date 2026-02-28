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

describe('Dashboard Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /dashboard', () => {
    const mockUser = {
      id: 'user-1',
      displayName: 'Sophie Williams',
      role: 'server',
      locationId: 'loc-1',
      location: { id: 'loc-1', name: 'Downtown' },
    };

    it('should return full dashboard data', async () => {
      const mockShift = {
        id: 'shift-1',
        employeeId: 'user-1',
        locationId: 'loc-1',
        date: new Date('2026-03-02'),
        startTime: '09:00',
        endTime: '17:00',
        role: 'server',
        location: { id: 'loc-1', name: 'Downtown' },
      };

      const mockPayPeriod = {
        id: 'pay-1',
        employeeId: 'user-1',
        startDate: new Date('2026-02-16'),
        endDate: new Date('2026-02-28'),
        payDate: new Date('2026-03-05'),
        hoursWorked: 36,
        hourlyRate: 18,
        grossPay: 648,
        netPay: 505.44,
        status: 'pending',
      };

      const mockPraise = [
        {
          id: 'praise-1',
          fromUserId: 'user-2',
          toUserId: 'user-1',
          message: 'Great teamwork!',
          category: 'teamwork',
          fromUser: { id: 'user-2', displayName: 'James Chen', avatarUrl: null },
          toUser: { id: 'user-1', displayName: 'Sophie Williams', avatarUrl: null },
        },
      ];

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.shift.findFirst as jest.Mock).mockResolvedValue(mockShift);
      (mockPrisma.shift.findMany as jest.Mock).mockResolvedValue([mockShift]);
      (mockPrisma.channelMember.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.readReceipt.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payPeriod.findFirst as jest.Mock).mockResolvedValue(mockPayPeriod);
      (mockPrisma.praise.findMany as jest.Mock).mockResolvedValue(mockPraise);

      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.user.displayName).toBe('Sophie Williams');
      expect(res.body.user.role).toBe('server');
      expect(res.body.user.location.name).toBe('Downtown');
      expect(res.body.nextShift).toBeDefined();
      expect(res.body.nextShift.startTime).toBe('09:00');
      expect(res.body.weekShifts).toHaveLength(1);
      expect(res.body.unreadSummary.totalUnread).toBe(0);
      expect(res.body.unreadSummary.channels).toHaveLength(0);
      expect(res.body.nextPay).toBeDefined();
      expect(res.body.nextPay.netPay).toBe(505.44);
      expect(res.body.nextPay.status).toBe('pending');
      expect(res.body.recentPraise).toHaveLength(1);
      expect(res.body.recentPraise[0].message).toBe('Great teamwork!');
    });

    it('should return null nextShift when none upcoming', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.shift.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.shift.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.channelMember.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.readReceipt.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payPeriod.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.praise.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.nextShift).toBeNull();
      expect(res.body.nextPay).toBeNull();
      expect(res.body.weekShifts).toHaveLength(0);
      expect(res.body.recentPraise).toHaveLength(0);
    });

    it('should include unread channel counts', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.shift.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.shift.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.channelMember.findMany as jest.Mock).mockResolvedValue([
        { channelId: 'ch-1', channel: { id: 'ch-1', name: 'general' } },
      ]);
      (mockPrisma.readReceipt.findMany as jest.Mock).mockResolvedValue([
        { channelId: 'ch-1', conversationId: null, lastReadMessageId: 'msg-5' },
      ]);
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ createdAt: new Date('2026-02-27T10:00:00Z') });
      (mockPrisma.message.count as jest.Mock).mockResolvedValue(3);
      (mockPrisma.payPeriod.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.praise.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.unreadSummary.totalUnread).toBe(3);
      expect(res.body.unreadSummary.channels).toHaveLength(1);
      expect(res.body.unreadSummary.channels[0].name).toBe('general');
      expect(res.body.unreadSummary.channels[0].count).toBe(3);
    });

    it('should 404 if user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', authHeader());

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/dashboard');
      expect(res.status).toBe(401);
    });
  });
});
