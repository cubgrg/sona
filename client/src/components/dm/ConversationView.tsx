import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useConversationStore } from '../../stores/conversationStore';
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
import api from '../../services/api';

export function ConversationView() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { activeConversation, fetchConversation } = useConversationStore();
  const { messages, addMessage, updateMessage, removeMessage, updateReplyCount, updateReactions, clearMessages } =
    useMessageStore();
  const user = useAuthStore((s) => s.user);
  const closeThread = useThreadStore((s) => s.closeThread);
  const markAsRead = useUnreadStore((s) => s.markAsRead);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation details and messages
  useEffect(() => {
    if (!conversationId) return;
    fetchConversation(conversationId);
    clearMessages();
    closeThread();

    // Fetch DM messages
    api.get<Message[]>(`/conversations/${conversationId}/messages?limit=50`).then(({ data }) => {
      for (const msg of data) {
        addMessage(msg);
      }
    });
  }, [conversationId, fetchConversation, clearMessages, addMessage, closeThread]);

  // Listen for real-time messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    function handleNewMessage(message: Message) {
      if (message.conversationId === conversationId && !message.threadParentId) {
        addMessage(message);
      }
    }

    function handleEditMessage(message: Message) {
      if (message.conversationId === conversationId) {
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
  }, [conversationId, addMessage, updateMessage, removeMessage, updateReplyCount, updateReactions]);

  // Auto-scroll to bottom on new messages and mark as read
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (conversationId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      markAsRead(conversationId, lastMsg.id, 'conversation');
    }
  }, [messages, conversationId, markAsRead]);

  function handleSend(content: string) {
    const socket = getSocket();
    if (!socket || !conversationId) return;
    socket.emit('message:send', { content, conversationId });
  }

  // Get the other participant's name
  const otherMember = activeConversation?.members.find((m) => m.userId !== user?.id);
  const displayName = otherMember?.user.displayName || 'Loading...';

  if (!conversationId) return null;

  return (
    <div className="flex-1 flex min-w-0">
      {/* Main conversation area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-gray-200 flex items-center px-4 shrink-0 bg-white">
          <span className={`w-2.5 h-2.5 rounded-full mr-2 ${otherMember?.user.status === 'online' ? 'bg-green-400' : 'bg-gray-300'}`} />
          <h2 className="font-semibold text-gray-900">{displayName}</h2>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              <div className="text-center">
                <p className="font-medium text-gray-600 mb-1">Start of your conversation with {displayName}</p>
                <p>Send a message to get started.</p>
              </div>
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
        <TypingIndicator conversationId={conversationId} />

        {/* Input */}
        <MessageInput
          channelName={displayName}
          onSend={handleSend}
          conversationId={conversationId}
        />
      </div>

      {/* Thread panel */}
      <ThreadView />
    </div>
  );
}
