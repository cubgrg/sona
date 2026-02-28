import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const praiseRouter = Router();

praiseRouter.use(authenticate);

// Send praise — auto-creates a FeedPost of type "praise"
praiseRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { toUserId, message, category } = req.body;

  if (!toUserId || !message) {
    res.status(400).json({ error: 'toUserId and message are required' });
    return;
  }

  if (toUserId === req.user!.userId) {
    res.status(400).json({ error: 'Cannot praise yourself' });
    return;
  }

  const recipient = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true, displayName: true },
  });

  if (!recipient) {
    res.status(404).json({ error: 'Recipient not found' });
    return;
  }

  const sender = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, displayName: true, locationId: true },
  });

  // Create the praise and its associated feed post in a transaction
  const praise = await prisma.$transaction(async (tx) => {
    const feedPost = await tx.feedPost.create({
      data: {
        authorId: req.user!.userId,
        type: 'praise',
        content: message,
        locationScope: sender?.locationId || 'all',
      },
    });

    return tx.praise.create({
      data: {
        fromUserId: req.user!.userId,
        toUserId,
        message,
        category,
        feedPostId: feedPost.id,
      },
      include: {
        fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
        toUser: { select: { id: true, displayName: true, avatarUrl: true } },
        feedPost: {
          include: {
            author: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
            reactions: true,
            praise: {
              include: {
                fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
                toUser: { select: { id: true, displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });
  });

  res.status(201).json(praise);
});

// Get praise received by the current user
praiseRouter.get('/received', async (req: Request, res: Response): Promise<void> => {
  const praises = await prisma.praise.findMany({
    where: { toUserId: req.user!.userId },
    include: {
      fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
      toUser: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(praises);
});

// Get praise given by the current user
praiseRouter.get('/given', async (req: Request, res: Response): Promise<void> => {
  const praises = await prisma.praise.findMany({
    where: { fromUserId: req.user!.userId },
    include: {
      fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
      toUser: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(praises);
});
