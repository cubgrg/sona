import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/users';
import { channelRouter } from './routes/channels';
import { messageRouter } from './routes/messages';
import { conversationRouter } from './routes/conversations';
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
app.use('/', messageRouter);

// Error handler
app.use(errorHandler);

export { app };
