import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const channelRouter = Router();
channelRouter.use(authenticate);

const createChannelSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Channel name must be lowercase alphanumeric with dashes'),
  description: z.string().max(250).optional(),
  isPrivate: z.boolean().optional().default(false),
});

// List channels the current user is a member of
channelRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const channels = await prisma.channel.findMany({
    where: { members: { some: { userId: req.user!.userId } } },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json(channels);
});

// Create a channel and auto-join the creator as admin
channelRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = createChannelSchema.parse(req.body);

    const existing = await prisma.channel.findUnique({ where: { name: body.name } });
    if (existing) {
      res.status(409).json({ error: 'A channel with that name already exists' });
      return;
    }

    const channel = await prisma.channel.create({
      data: {
        name: body.name,
        description: body.description,
        isPrivate: body.isPrivate,
        createdBy: req.user!.userId,
        members: {
          create: { userId: req.user!.userId, role: 'admin' },
        },
      },
      include: { _count: { select: { members: true } } },
    });

    res.status(201).json(channel);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    throw err;
  }
});

// Get a single channel's details
channelRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true, status: true } },
        },
      },
      _count: { select: { members: true } },
    },
  });

  if (!channel) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }

  res.json(channel);
});

// Join a channel
channelRouter.post('/:id/join', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const channel = await prisma.channel.findUnique({ where: { id } });
  if (!channel) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }

  const existingMember = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: req.user!.userId } },
  });

  if (existingMember) {
    res.json({ message: 'Already a member' });
    return;
  }

  await prisma.channelMember.create({
    data: { channelId: id, userId: req.user!.userId },
  });

  res.status(201).json({ message: 'Joined channel' });
});

// Leave a channel
channelRouter.post('/:id/leave', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  await prisma.channelMember.deleteMany({
    where: { channelId: id, userId: req.user!.userId },
  });

  res.json({ message: 'Left channel' });
});

// Browse all public channels (for discovery / joining)
channelRouter.get('/browse/all', async (_req: Request, res: Response): Promise<void> => {
  const channels = await prisma.channel.findMany({
    where: { isPrivate: false },
    include: { _count: { select: { members: true } } },
    orderBy: { name: 'asc' },
  });

  res.json(channels);
});
