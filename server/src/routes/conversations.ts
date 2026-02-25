import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const conversationRouter = Router();
conversationRouter.use(authenticate);

// List all conversations for the current user
conversationRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const conversations = await prisma.conversation.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true, status: true } },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, displayName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(conversations);
});

// Start a new DM conversation (or return existing one)
conversationRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { recipientId } = req.body;

  if (!recipientId) {
    res.status(400).json({ error: 'recipientId is required' });
    return;
  }

  if (recipientId === userId) {
    res.status(400).json({ error: 'Cannot start a conversation with yourself' });
    return;
  }

  // Check recipient exists
  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Check if a conversation already exists between these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: recipientId } } },
      ],
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true, status: true } },
        },
      },
    },
  });

  if (existing) {
    res.json(existing);
    return;
  }

  // Create new conversation with both members
  const conversation = await prisma.conversation.create({
    data: {
      members: {
        create: [
          { userId },
          { userId: recipientId },
        ],
      },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true, status: true } },
        },
      },
    },
  });

  res.status(201).json(conversation);
});

// Get a single conversation's details
conversationRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.user!.userId;

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      members: { some: { userId } },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true, status: true } },
        },
      },
    },
  });

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  res.json(conversation);
});

// Get messages for a conversation (paginated, cursor-based)
conversationRouter.get('/:id/messages', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.user!.userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const cursor = req.query.cursor as string | undefined;

  // Verify user is a member
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId } },
  });

  if (!membership) {
    res.status(403).json({ error: 'Not a member of this conversation' });
    return;
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id, threadParentId: null },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true } },
      _count: { select: { threadReplies: true } },
      reactions: { include: { user: { select: { id: true, displayName: true } } } },
    },
  });

  res.json(messages.reverse());
});
