import { useEffect, useRef } from 'react';
import { useThreadStore } from '../../stores/threadStore';
import { useAuthStore } from '../../stores/authStore';
import { getSocket } from '../../services/socket';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import type { Message } from '../../types';

export function ThreadView() {
  const { parentMessage, replies, isOpen, isLoading, closeThread, addReply, updateReply, removeReply } =
    useThreadStore();
  const user = useAuthStore((s) => s.user);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  // Listen for real-time thread replies
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !parentMessage) return;

    function handleNewMessage(message: Message) {
      if (message.threadParentId === parentMessage!.id) {
        addReply(message);
      }
    }

    function handleEditMessage(message: Message) {
      if (message.threadParentId === parentMessage!.id) {
        updateReply(message);
      }
    }

    function handleDeleteMessage(data: { messageId: string }) {
      removeReply(data.messageId);
    }

    socket.on('message:new', handleNewMessage);
    socket.on('message:edit', handleEditMessage);
    socket.on('message:delete', handleDeleteMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:edit', handleEditMessage);
      socket.off('message:delete', handleDeleteMessage);
    };
  }, [parentMessage, addReply, updateReply, removeReply]);

  // Auto-scroll to bottom on new replies
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  if (!isOpen) return null;

  function handleSend(content: string) {
    const socket = getSocket();
    if (!socket || !parentMessage) return;
    socket.emit('message:send', {
      content,
      channelId: parentMessage.channelId,
      conversationId: parentMessage.conversationId,
      threadParentId: parentMessage.id,
    });
  }

  return (
    <div className="fixed inset-0 z-20 md:relative md:inset-auto md:w-96 border-l border-gray-200 flex flex-col bg-white shrink-0">
      {/* Thread header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <h3 className="font-semibold text-gray-900">Thread</h3>
        <button
          onClick={closeThread}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading thread...
        </div>
      ) : (
        <>
          {/* Parent message */}
          {parentMessage && (
            <div className="border-b border-gray-100 py-2">
              <MessageItem
                message={parentMessage}
                isOwnMessage={parentMessage.authorId === user?.id}
              />
            </div>
          )}

          {/* Replies */}
          <div className="flex-1 overflow-y-auto py-2">
            {replies.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm px-4 text-center">
                No replies yet. Start the thread!
              </div>
            ) : (
              replies.map((reply) => (
                <MessageItem
                  key={reply.id}
                  message={reply}
                  isOwnMessage={reply.authorId === user?.id}
                />
              ))
            )}
            <div ref={repliesEndRef} />
          </div>

          {/* Thread input */}
          <MessageInput channelName="thread" onSend={handleSend} />
        </>
      )}
    </div>
  );
}
