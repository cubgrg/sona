import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const shiftRouter = Router();

shiftRouter.use(authenticate);

// Get the user's next upcoming shift
shiftRouter.get('/me/next', async (req: Request, res: Response): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const shift = await prisma.shift.findFirst({
    where: {
      employeeId: req.user!.userId,
      date: { gte: today },
    },
    include: { location: true },
    orderBy: { date: 'asc' },
  });

  res.json(shift);
});

// Get the user's shifts for the current week (Mon-Sun)
shiftRouter.get('/me/week', async (req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Monday = start of week (0=Sun, 1=Mon, ...)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const shifts = await prisma.shift.findMany({
    where: {
      employeeId: req.user!.userId,
      date: { gte: monday, lte: sunday },
    },
    include: { location: true },
    orderBy: { date: 'asc' },
  });

  res.json(shifts);
});

// Get shifts for a date range
shiftRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const { from, to } = req.query;
  const where: Record<string, unknown> = { employeeId: req.user!.userId };

  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from as string);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to as string);
  }

  const shifts = await prisma.shift.findMany({
    where,
    include: { location: true },
    orderBy: { date: 'asc' },
  });

  res.json(shifts);
});
