import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthPayload } from '../middleware/auth';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function registerSocketHandlers(io: Server) {
  // Authenticate socket connections via JWT
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`User connected: ${userId}`);

    // Update user status to online
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'online' },
    });

    // Join all channel rooms the user is a member of
    const memberships = await prisma.channelMember.findMany({
      where: { userId },
      select: { channelId: true },
    });

    for (const m of memberships) {
      socket.join(`channel:${m.channelId}`);
    }

    // Join all conversation rooms the user is a member of
    const conversationMemberships = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    for (const cm of conversationMemberships) {
      socket.join(`conversation:${cm.conversationId}`);
    }

    // Join user's private room (for DMs and notifications)
    socket.join(`user:${userId}`);

    // Broadcast online status to everyone
    io.emit('user:presence', { userId, status: 'online' });

    // Handle joining a channel room (after REST join)
    socket.on('channel:join', (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    // Handle leaving a channel room
    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    // Handle joining a conversation room (after REST create)
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Handle sending a message
    socket.on('message:send', async (data: {
      content: string;
      channelId?: string;
      conversationId?: string;
      threadParentId?: string;
    }) => {
      const message = await prisma.message.create({
        data: {
          content: data.content,
          authorId: userId,
          channelId: data.channelId || null,
          conversationId: data.conversationId || null,
          threadParentId: data.threadParentId || null,
        },
        include: {
          author: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      });

      // Determine the room to broadcast to
      const room = data.channelId
        ? `channel:${data.channelId}`
        : `conversation:${data.conversationId}`;

      // Broadcast to the appropriate room
      if (room) {
        io.to(room).emit('message:new', message);
      }

      // If this is a thread reply, also emit a reply count update
      if (data.threadParentId) {
        const replyCount = await prisma.message.count({
          where: { threadParentId: data.threadParentId },
        });
        io.to(room).emit('thread:reply_count', {
          parentMessageId: data.threadParentId,
          replyCount,
        });
      }
    });

    // Handle editing a message
    socket.on('message:edit', async (data: { messageId: string; content: string }) => {
      const message = await prisma.message.update({
        where: { id: data.messageId, authorId: userId },
        data: { content: data.content, editedAt: new Date() },
        include: {
          author: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      });

      if (message.channelId) {
        io.to(`channel:${message.channelId}`).emit('message:edit', message);
      } else if (message.conversationId) {
        io.to(`conversation:${message.conversationId}`).emit('message:edit', message);
      }
    });

    // Handle deleting a message
    socket.on('message:delete', async (data: { messageId: string }) => {
      const message = await prisma.message.delete({
        where: { id: data.messageId, authorId: userId },
      });

      const room = message.channelId
        ? `channel:${message.channelId}`
        : `conversation:${message.conversationId}`;

      io.to(room).emit('message:delete', { messageId: data.messageId });
    });

    // Toggle reaction on a message
    socket.on('reaction:toggle', async (data: { messageId: string; emoji: string }) => {
      // Check if user already reacted with this emoji
      const existing = await prisma.reaction.findUnique({
        where: {
          userId_messageId_emoji: {
            userId,
            messageId: data.messageId,
            emoji: data.emoji,
          },
        },
      });

      if (existing) {
        // Remove reaction
        await prisma.reaction.delete({ where: { id: existing.id } });
      } else {
        // Add reaction
        await prisma.reaction.create({
          data: { userId, messageId: data.messageId, emoji: data.emoji },
        });
      }

      // Fetch all reactions for the message grouped by emoji
      const reactions = await prisma.reaction.findMany({
        where: { messageId: data.messageId },
        include: { user: { select: { id: true, displayName: true } } },
      });

      // Get the message to find its room
      const message = await prisma.message.findUnique({
        where: { id: data.messageId },
        select: { channelId: true, conversationId: true },
      });

      if (message) {
        const room = message.channelId
          ? `channel:${message.channelId}`
          : `conversation:${message.conversationId}`;

        io.to(room).emit('reaction:update', {
          messageId: data.messageId,
          reactions,
        });
      }
    });

    // Typing indicator
    socket.on('user:typing', async (data: { channelId?: string; conversationId?: string }) => {
      const room = data.channelId
        ? `channel:${data.channelId}`
        : `conversation:${data.conversationId}`;

      const userInfo = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      });

      socket.to(room).emit('user:typing', {
        userId,
        displayName: userInfo?.displayName || 'Someone',
        channelId: data.channelId,
        conversationId: data.conversationId,
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`);
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'offline' },
      });
      io.emit('user:presence', { userId, status: 'offline' });
    });
  });
}
