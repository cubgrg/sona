import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const locationRouter = Router();

locationRouter.use(authenticate);

locationRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  const locations = await prisma.location.findMany({
    orderBy: { name: 'asc' },
  });

  res.json(locations);
});

locationRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const location = await prisma.location.findUnique({
    where: { id: req.params.id as string },
    include: { _count: { select: { users: true } } },
  });

  if (!location) {
    res.status(404).json({ error: 'Location not found' });
    return;
  }

  res.json(location);
});
