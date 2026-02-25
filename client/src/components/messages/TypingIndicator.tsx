import { useState, useEffect } from 'react';
import { getSocket } from '../../services/socket';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  channelId?: string;
  conversationId?: string;
}

interface TypingUser {
  userId: string;
  displayName: string;
  timeout: ReturnType<typeof setTimeout>;
}

export function TypingIndicator({ channelId, conversationId }: Props) {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleTyping(data: {
      userId: string;
      displayName: string;
      channelId?: string;
      conversationId?: string;
    }) {
      // Ignore own typing events
      if (data.userId === currentUserId) return;

      // Only show typing for the current channel/conversation
      if (channelId && data.channelId !== channelId) return;
      if (conversationId && data.conversationId !== conversationId) return;

      setTypingUsers((prev) => {
        const updated = new Map(prev);

        // Clear existing timeout for this user
        const existing = updated.get(data.userId);
        if (existing) clearTimeout(existing.timeout);

        // Set new timeout to remove after 3 seconds
        const timeout = setTimeout(() => {
          setTypingUsers((p) => {
            const next = new Map(p);
            next.delete(data.userId);
            return next;
          });
        }, 3000);

        updated.set(data.userId, {
          userId: data.userId,
          displayName: data.displayName,
          timeout,
        });

        return updated;
      });
    }

    socket.on('user:typing', handleTyping);

    return () => {
      socket.off('user:typing', handleTyping);
      // Clear all timeouts on unmount
      setTypingUsers((prev) => {
        prev.forEach((u) => clearTimeout(u.timeout));
        return new Map();
      });
    };
  }, [channelId, conversationId, currentUserId]);

  // Clear typing users when channel/conversation changes
  useEffect(() => {
    setTypingUsers((prev) => {
      prev.forEach((u) => clearTimeout(u.timeout));
      return new Map();
    });
  }, [channelId, conversationId]);

  const names = Array.from(typingUsers.values()).map((u) => u.displayName);

  if (names.length === 0) return <div className="h-5" />;

  let text: string;
  if (names.length === 1) {
    text = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing...`;
  } else {
    text = 'Several people are typing...';
  }

  return (
    <div className="h-5 px-4 text-xs text-gray-500 flex items-center gap-1">
      <span className="inline-flex gap-0.5">
        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      <span>{text}</span>
    </div>
  );
}
