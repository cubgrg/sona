import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true, status: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

userRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, displayName: true, avatarUrl: true, status: true },
    orderBy: { displayName: 'asc' },
  });

  res.json(users);
});
