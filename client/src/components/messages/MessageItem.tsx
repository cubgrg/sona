import { useState, useRef, useEffect } from 'react';
import { useThreadStore } from '../../stores/threadStore';
import { useAuthStore } from '../../stores/authStore';
import { getSocket } from '../../services/socket';
import type { Message, ReactionData } from '../../types';

interface Props {
  message: Message;
  isOwnMessage: boolean;
  showThreadButton?: boolean;
}

const QUICK_EMOJIS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F389}', '\u{1F914}', '\u{1F440}', '\u{1F64F}', '\u{1F525}'];

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function groupReactions(reactions: ReactionData[]) {
  const grouped = new Map<string, { emoji: string; count: number; userIds: string[]; userNames: string[] }>();
  for (const r of reactions) {
    const existing = grouped.get(r.emoji);
    if (existing) {
      existing.count++;
      existing.userIds.push(r.userId);
      existing.userNames.push(r.user.displayName);
    } else {
      grouped.set(r.emoji, { emoji: r.emoji, count: 1, userIds: [r.userId], userNames: [r.user.displayName] });
    }
  }
  return Array.from(grouped.values());
}

export function MessageItem({ message, isOwnMessage, showThreadButton = true }: Props) {
  const openThread = useThreadStore((s) => s.openThread);
  const currentUser = useAuthStore((s) => s.user);
  const replyCount = message._count?.threadReplies ?? 0;
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker]);

  function toggleReaction(emoji: string) {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('reaction:toggle', { messageId: message.id, emoji });
    setShowPicker(false);
  }

  const reactions = message.reactions || [];
  const grouped = groupReactions(reactions);

  return (
    <div className={`group flex gap-3 px-4 py-1.5 hover:bg-gray-50 ${isOwnMessage ? '' : ''}`}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {message.author.avatarUrl ? (
          <img src={message.author.avatarUrl} alt="" className="w-full h-full rounded-full" />
        ) : (
          getInitials(message.author.displayName)
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm text-gray-900">
            {message.author.displayName}
          </span>
          <span className="text-xs text-gray-400">
            {formatTime(message.createdAt)}
            {message.editedAt && ' (edited)'}
          </span>
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Reaction button */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="text-xs text-gray-400 hover:text-indigo-600 px-1"
                title="Add reaction"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {showPicker && (
                <div className="absolute right-0 bottom-full mb-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-1 z-10">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(emoji)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {showThreadButton && (
              <button
                onClick={() => openThread(message.id)}
                className="text-xs text-gray-400 hover:text-indigo-600"
              >
                Reply
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Reactions */}
        {grouped.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {grouped.map((g) => {
              const hasReacted = currentUser ? g.userIds.includes(currentUser.id) : false;
              return (
                <button
                  key={g.emoji}
                  onClick={() => toggleReaction(g.emoji)}
                  title={g.userNames.join(', ')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    hasReacted
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{g.emoji}</span>
                  <span>{g.count}</span>
                </button>
              );
            })}
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-dashed border-gray-300 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              +
            </button>
          </div>
        )}

        {/* Thread reply count badge */}
        {showThreadButton && replyCount > 0 && (
          <button
            onClick={() => openThread(message.id)}
            className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>
    </div>
  );
}
