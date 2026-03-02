import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/users';
import { channelRouter } from './routes/channels';
import { messageRouter } from './routes/messages';
import { conversationRouter } from './routes/conversations';
import { locationRouter } from './routes/locations';
import { shiftRouter } from './routes/shifts';
import { feedRouter } from './routes/feed';
import { praiseRouter } from './routes/praise';
import { dashboardRouter } from './routes/dashboard';
import { payrollChatRouter } from './routes/payrollChat';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Health check (before auth middleware)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/channels', channelRouter);
app.use('/conversations', conversationRouter);
app.use('/locations', locationRouter);
app.use('/shifts', shiftRouter);
app.use('/feed', feedRouter);
app.use('/praise', praiseRouter);
app.use('/dashboard', dashboardRouter);
app.use('/payroll', payrollChatRouter);
app.use('/', messageRouter);

// Error handler
app.use(errorHandler);

export { app };
