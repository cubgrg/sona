import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useChannelStore } from '../../stores/channelStore';
import { useMessageStore } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import { useThreadStore } from '../../stores/threadStore';
import { useUnreadStore } from '../../stores/unreadStore';
import { getSocket } from '../../services/socket';
import { MessageItem } from '../messages/MessageItem';
import { MessageInput } from '../messages/MessageInput';
import { TypingIndicator } from '../messages/TypingIndicator';
import { ThreadView } from '../messages/ThreadView';
import type { Message, ReactionData } from '../../types';

export function ChannelView() {
  const { channelId } = useParams<{ channelId: string }>();
  const { activeChannel, fetchChannel } = useChannelStore();
  const { messages, fetchMessages, addMessage, updateMessage, removeMessage, updateReplyCount, updateReactions, clearMessages } =
    useMessageStore();
  const user = useAuthStore((s) => s.user);
  const closeThread = useThreadStore((s) => s.closeThread);
  const markAsRead = useUnreadStore((s) => s.markAsRead);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load channel details and messages
  useEffect(() => {
    if (!channelId) return;
    fetchChannel(channelId);
    clearMessages();
    closeThread();
    fetchMessages(channelId);
  }, [channelId, fetchChannel, fetchMessages, clearMessages, closeThread]);

  // Listen for real-time messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !channelId) return;

    function handleNewMessage(message: Message) {
      if (message.channelId === channelId && !message.threadParentId) {
        addMessage(message);
      }
    }

    function handleEditMessage(message: Message) {
      if (message.channelId === channelId) {
        updateMessage(message);
      }
    }

    function handleDeleteMessage(data: { messageId: string }) {
      removeMessage(data.messageId);
    }

    function handleReplyCount(data: { parentMessageId: string; replyCount: number }) {
      updateReplyCount(data.parentMessageId, data.replyCount);
    }

    function handleReactionUpdate(data: { messageId: string; reactions: ReactionData[] }) {
      updateReactions(data.messageId, data.reactions);
    }

    socket.on('message:new', handleNewMessage);
    socket.on('message:edit', handleEditMessage);
    socket.on('message:delete', handleDeleteMessage);
    socket.on('thread:reply_count', handleReplyCount);
    socket.on('reaction:update', handleReactionUpdate);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:edit', handleEditMessage);
      socket.off('message:delete', handleDeleteMessage);
      socket.off('thread:reply_count', handleReplyCount);
      socket.off('reaction:update', handleReactionUpdate);
    };
  }, [channelId, addMessage, updateMessage, removeMessage, updateReplyCount, updateReactions]);

  // Auto-scroll to bottom on new messages and mark as read
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (channelId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      markAsRead(channelId, lastMsg.id, 'channel');
    }
  }, [messages, channelId, markAsRead]);

  function handleSend(content: string) {
    const socket = getSocket();
    if (!socket || !channelId) return;
    socket.emit('message:send', { content, channelId });
  }

  if (!channelId) return null;

  return (
    <div className="flex-1 flex min-w-0">
      {/* Main channel area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <header className="h-14 border-b border-gray-200 flex items-center px-4 shrink-0 bg-white">
          <span className="text-gray-400 mr-1">#</span>
          <h2 className="font-semibold text-gray-900">{activeChannel?.name || '...'}</h2>
          {activeChannel?.description && (
            <span className="ml-3 text-sm text-gray-500 truncate">
              {activeChannel.description}
            </span>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {activeChannel?._count.members} member{activeChannel?._count.members !== 1 ? 's' : ''}
          </span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                isOwnMessage={msg.authorId === user?.id}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        <TypingIndicator channelId={channelId} />

        {/* Input */}
        <MessageInput
          channelName={activeChannel?.name || 'channel'}
          onSend={handleSend}
          channelId={channelId}
        />
      </div>

      {/* Thread panel */}
      <ThreadView />
    </div>
  );
}
