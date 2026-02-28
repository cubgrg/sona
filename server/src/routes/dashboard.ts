import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  // Fetch user with location
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      role: true,
      locationId: true,
      location: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get next shift
  const nextShift = await prisma.shift.findFirst({
    where: { employeeId: userId, date: { gte: today } },
    include: { location: { select: { id: true, name: true } } },
    orderBy: { date: 'asc' },
  });

  // Get week shifts (Mon-Sun)
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekShifts = await prisma.shift.findMany({
    where: { employeeId: userId, date: { gte: monday, lte: sunday } },
    include: { location: { select: { id: true, name: true } } },
    orderBy: { date: 'asc' },
  });

  // Get unread summary
  const channelMemberships = await prisma.channelMember.findMany({
    where: { userId },
    select: { channelId: true, channel: { select: { id: true, name: true } } },
  });

  const readReceipts = await prisma.readReceipt.findMany({
    where: { userId },
    select: { channelId: true, conversationId: true, lastReadMessageId: true },
  });

  const receiptMap = new Map<string, string>();
  for (const r of readReceipts) {
    const key = r.channelId || r.conversationId || '';
    receiptMap.set(key, r.lastReadMessageId);
  }

  const unreadChannels: { id: string; name: string; count: number }[] = [];
  let totalUnread = 0;

  for (const membership of channelMemberships) {
    const lastReadId = receiptMap.get(membership.channelId);
    let count: number;

    if (lastReadId) {
      const lastReadMsg = await prisma.message.findUnique({
        where: { id: lastReadId },
        select: { createdAt: true },
      });
      count = await prisma.message.count({
        where: {
          channelId: membership.channelId,
          threadParentId: null,
          ...(lastReadMsg ? { createdAt: { gt: lastReadMsg.createdAt } } : {}),
        },
      });
    } else {
      count = await prisma.message.count({
        where: { channelId: membership.channelId, threadParentId: null },
      });
    }

    if (count > 0) {
      unreadChannels.push({ id: membership.channel.id, name: membership.channel.name, count });
      totalUnread += count;
    }
  }

  // Next pay period (pending)
  const nextPay = await prisma.payPeriod.findFirst({
    where: { employeeId: userId, status: 'pending' },
    orderBy: { payDate: 'asc' },
  });

  // Recent praise received (last 3)
  const recentPraise = await prisma.praise.findMany({
    where: { toUserId: userId },
    include: {
      fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
      toUser: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  res.json({
    user,
    nextShift,
    weekShifts,
    unreadSummary: { totalUnread, channels: unreadChannels },
    recentPraise,
    nextPay,
  });
});
