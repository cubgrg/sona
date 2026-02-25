import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const messageRouter = Router();
messageRouter.use(authenticate);

// Get messages for a channel (paginated, cursor-based)
messageRouter.get('/channels/:id/messages', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const cursor = req.query.cursor as string | undefined;

  const messages = await prisma.message.findMany({
    where: { channelId: id, threadParentId: null },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      _count: { select: { threadReplies: true } },
      reactions: { include: { user: { select: { id: true, displayName: true } } } },
    },
  });

  // Return in chronological order
  res.json(messages.reverse());
});

// Get thread replies for a message
messageRouter.get('/messages/:id/thread', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  // Verify the parent message exists
  const parent = await prisma.message.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      _count: { select: { threadReplies: true } },
    },
  });

  if (!parent) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  const replies = await prisma.message.findMany({
    where: { threadParentId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });

  res.json({ parent, replies });
});

// Search messages across all channels and conversations the user has access to
messageRouter.get('/messages/search', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const query = (req.query.q as string || '').trim();

  if (!query) {
    res.json([]);
    return;
  }

  // Get user's channel and conversation IDs
  const channelMemberships = await prisma.channelMember.findMany({
    where: { userId },
    select: { channelId: true },
  });
  const conversationMemberships = await prisma.conversationMember.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  const channelIds = channelMemberships.map((m) => m.channelId);
  const conversationIds = conversationMemberships.map((m) => m.conversationId);

  const messages = await prisma.message.findMany({
    where: {
      content: { contains: query, mode: 'insensitive' },
      OR: [
        { channelId: { in: channelIds } },
        { conversationId: { in: conversationIds } },
      ],
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      channel: { select: { id: true, name: true } },
    },
  });

  res.json(messages);
});

// Mark a channel or conversation as read (upsert read receipt)
messageRouter.post('/read', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { channelId, conversationId, lastReadMessageId } = req.body;

  if (!lastReadMessageId || (!channelId && !conversationId)) {
    res.status(400).json({ error: 'lastReadMessageId and either channelId or conversationId are required' });
    return;
  }

  if (channelId) {
    await prisma.readReceipt.upsert({
      where: { userId_channelId: { userId, channelId } },
      update: { lastReadMessageId },
      create: { userId, channelId, lastReadMessageId },
    });
  } else {
    await prisma.readReceipt.upsert({
      where: { userId_conversationId: { userId, conversationId } },
      update: { lastReadMessageId },
      create: { userId, conversationId, lastReadMessageId },
    });
  }

  res.json({ ok: true });
});

// Get unread counts for all channels and conversations the user belongs to
messageRouter.get('/unread', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  // Get all read receipts for this user
  const receipts = await prisma.readReceipt.findMany({
    where: { userId },
  });

  const receiptMap = new Map<string, { lastReadMessageId: string }>();
  for (const r of receipts) {
    const key = r.channelId || r.conversationId!;
    receiptMap.set(key, { lastReadMessageId: r.lastReadMessageId });
  }

  // Get user's channels
  const channelMemberships = await prisma.channelMember.findMany({
    where: { userId },
    select: { channelId: true },
  });

  // Get user's conversations
  const conversationMemberships = await prisma.conversationMember.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  const unreadCounts: Record<string, number> = {};

  // Count unread messages per channel
  for (const { channelId } of channelMemberships) {
    const receipt = receiptMap.get(channelId);
    if (receipt) {
      // Get the createdAt of the last read message to compare
      const lastReadMsg = await prisma.message.findUnique({
        where: { id: receipt.lastReadMessageId },
        select: { createdAt: true },
      });
      if (lastReadMsg) {
        const count = await prisma.message.count({
          where: {
            channelId,
            threadParentId: null,
            createdAt: { gt: lastReadMsg.createdAt },
          },
        });
        if (count > 0) unreadCounts[channelId] = count;
      }
    } else {
      // No receipt = all messages are unread
      const count = await prisma.message.count({
        where: { channelId, threadParentId: null },
      });
      if (count > 0) unreadCounts[channelId] = count;
    }
  }

  // Count unread messages per conversation
  for (const { conversationId } of conversationMemberships) {
    const receipt = receiptMap.get(conversationId);
    if (receipt) {
      const lastReadMsg = await prisma.message.findUnique({
        where: { id: receipt.lastReadMessageId },
        select: { createdAt: true },
      });
      if (lastReadMsg) {
        const count = await prisma.message.count({
          where: {
            conversationId,
            threadParentId: null,
            createdAt: { gt: lastReadMsg.createdAt },
          },
        });
        if (count > 0) unreadCounts[conversationId] = count;
      }
    } else {
      const count = await prisma.message.count({
        where: { conversationId, threadParentId: null },
      });
      if (count > 0) unreadCounts[conversationId] = count;
    }
  }

  res.json(unreadCounts);
});
