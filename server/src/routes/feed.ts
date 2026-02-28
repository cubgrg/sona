import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const feedRouter = Router();

feedRouter.use(authenticate);

// List feed posts with pagination and scope filtering
feedRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const { scope, cursor, limit: limitStr } = req.query;
  const limit = Math.min(Number(limitStr) || 20, 50);

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { locationId: true },
  });

  const where: Record<string, unknown> = {};

  if (scope === 'my-location' && user?.locationId) {
    where.OR = [
      { locationScope: 'all' },
      { locationScope: user.locationId },
    ];
  }
  // If scope is 'all' or not specified, show everything

  const posts = await prisma.feedPost.findMany({
    where,
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
      reactions: {
        include: { user: { select: { id: true, displayName: true } } },
      },
      praise: {
        include: {
          fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
          toUser: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
  });

  res.json(posts);
});

// Create a feed post
feedRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { type, title, content, imageUrl, locationScope } = req.body;

  if (!content) {
    res.status(400).json({ error: 'Content is required' });
    return;
  }

  // Only managers can create non-praise post types
  if (type !== 'praise') {
    const author = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { role: true },
    });

    if (author?.role !== 'manager') {
      res.status(403).json({ error: 'Only managers can create this post type' });
      return;
    }
  }

  const post = await prisma.feedPost.create({
    data: {
      authorId: req.user!.userId,
      type: type || 'announcement',
      title,
      content,
      imageUrl,
      locationScope: locationScope || 'all',
    },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
      reactions: {
        include: { user: { select: { id: true, displayName: true } } },
      },
      praise: true,
    },
  });

  res.status(201).json(post);
});

// Get a single feed post
feedRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const post = await prisma.feedPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
      reactions: {
        include: { user: { select: { id: true, displayName: true } } },
      },
      praise: {
        include: {
          fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
          toUser: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  res.json(post);
});

// Delete own feed post
feedRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const post = await prisma.feedPost.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  if (post.authorId !== req.user!.userId) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  await prisma.feedPost.delete({ where: { id } });
  res.json({ ok: true });
});

// Toggle reaction on a feed post
feedRouter.post('/:id/reactions', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { emoji } = req.body;

  if (!emoji) {
    res.status(400).json({ error: 'Emoji is required' });
    return;
  }

  const post = await prisma.feedPost.findUnique({ where: { id } });
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  // Toggle: delete if exists, create if not
  const existing = await prisma.feedReaction.findUnique({
    where: {
      userId_feedPostId_emoji: {
        userId: req.user!.userId,
        feedPostId: id,
        emoji,
      },
    },
  });

  if (existing) {
    await prisma.feedReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.feedReaction.create({
      data: {
        userId: req.user!.userId,
        feedPostId: id,
        emoji,
      },
    });
  }

  // Return all reactions for this post
  const reactions = await prisma.feedReaction.findMany({
    where: { feedPostId: id },
    include: { user: { select: { id: true, displayName: true } } },
  });

  res.json(reactions);
});
