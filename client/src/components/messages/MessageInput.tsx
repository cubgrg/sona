import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { getSocket } from '../../services/socket';

interface Props {
  channelName: string;
  onSend: (content: string) => void;
  channelId?: string;
  conversationId?: string;
}

export function MessageInput({ channelName, onSend, channelId, conversationId }: Props) {
  const [content, setContent] = useState('');
  const lastTypingRef = useRef(0);

  const emitTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;

    const socket = getSocket();
    if (!socket) return;
    if (channelId) {
      socket.emit('user:typing', { channelId });
    } else if (conversationId) {
      socket.emit('user:typing', { conversationId });
    }
  }, [channelId, conversationId]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    if (e.target.value.trim()) {
      emitTyping();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setContent('');
  }

  return (
    <div className="px-4 pb-4">
      <div className="border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
        <textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          rows={1}
          className="w-full px-3 py-2.5 text-sm resize-none outline-none rounded-lg"
        />
      </div>
      <p className="text-xs text-gray-400 mt-1 px-1">
        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Enter</kbd> to send,{' '}
        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
