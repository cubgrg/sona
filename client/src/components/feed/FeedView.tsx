import { useEffect, useState } from 'react';
import { useFeedStore } from '../../stores/feedStore';
import { useAuthStore } from '../../stores/authStore';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import type { FeedPost, FeedReaction, User } from '../../types';

function formatRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function typeBadge(type: string) {
  switch (type) {
    case 'announcement': return { label: 'Announcement', cls: 'bg-blue-100 text-blue-700' };
    case 'event': return { label: 'Event', cls: 'bg-green-100 text-green-700' };
    case 'employee_of_month': return { label: 'Employee of the Month', cls: 'bg-yellow-100 text-yellow-700' };
    case 'policy_update': return { label: 'Policy Update', cls: 'bg-orange-100 text-orange-700' };
    case 'praise': return { label: 'Shoutout', cls: 'bg-pink-100 text-pink-700' };
    default: return { label: type, cls: 'bg-gray-100 text-gray-700' };
  }
}

function categoryLabel(cat: string | null) {
  if (!cat) return '';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const QUICK_EMOJIS = ['👏', '❤️', '🔥', '💯', '🎉'];

function groupReactions(reactions: FeedReaction[]) {
  const grouped = new Map<string, { emoji: string; count: number; userIds: string[] }>();
  for (const r of reactions) {
    const existing = grouped.get(r.emoji);
    if (existing) {
      existing.count++;
      existing.userIds.push(r.userId);
    } else {
      grouped.set(r.emoji, { emoji: r.emoji, count: 1, userIds: [r.userId] });
    }
  }
  return Array.from(grouped.values());
}

function FeedPostCard({ post }: { post: FeedPost }) {
  const userId = useAuthStore((s) => s.user?.id);
  const updateReactions = useFeedStore((s) => s.updateReactions);
  const badge = typeBadge(post.type);

  function handleReaction(emoji: string) {
    const socket = getSocket();
    if (socket) {
      socket.emit('feed:reaction_toggle', { feedPostId: post.id, emoji });
    }
  }

  // Listen for reaction updates for this post
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleUpdate(data: { feedPostId: string; reactions: FeedReaction[] }) {
      if (data.feedPostId === post.id) {
        updateReactions(post.id, data.reactions);
      }
    }

    socket.on('feed:reaction_update', handleUpdate);
    return () => { socket.off('feed:reaction_update', handleUpdate); };
  }, [post.id, updateReactions]);

  const grouped = groupReactions(post.reactions);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Author header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-semibold text-sm">
          {post.author.displayName.split(' ').map((n) => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900">{post.author.displayName}</span>
            {post.author.role && (
              <span className="text-[10px] text-gray-400">{formatRole(post.author.role)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{timeAgo(post.createdAt)}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          </div>
        </div>
        {post.isPinned && (
          <span className="text-xs text-amber-500 font-medium">Pinned</span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {post.title && (
          <h3 className="font-semibold text-gray-900 mb-1">{post.title}</h3>
        )}
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>

        {/* Praise callout */}
        {post.type === 'praise' && post.praise && (
          <div className="mt-3 bg-pink-50 border border-pink-100 rounded-lg p-3 flex items-start gap-2">
            <span className="text-lg">🌟</span>
            <div>
              <p className="text-sm font-medium text-pink-800">
                {post.praise.fromUser.displayName} shouted out {post.praise.toUser.displayName}
              </p>
              {post.praise.category && (
                <span className="text-[10px] font-medium text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                  {categoryLabel(post.praise.category)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reactions */}
      <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
        {grouped.map((g) => (
          <button
            key={g.emoji}
            onClick={() => handleReaction(g.emoji)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
              g.userIds.includes(userId || '')
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{g.emoji}</span>
            <span className="font-medium">{g.count}</span>
          </button>
        ))}
        {/* Quick add buttons */}
        <div className="flex items-center gap-0.5 ml-1">
          {QUICK_EMOJIS.filter((e) => !grouped.some((g) => g.emoji === e)).slice(0, 3).map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-sm hover:bg-gray-100 transition-colors opacity-40 hover:opacity-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreatePostModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState('announcement');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createPost = useFeedStore((s) => s.createPost);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      await createPost({ type, title: title || undefined, content });
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">New Post</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="announcement">Announcement</option>
            <option value="event">Event</option>
            <option value="policy_update">Policy Update</option>
          </select>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
          />
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
}

const SHOUTOUT_CATEGORIES = [
  { value: 'teamwork', label: 'Teamwork', emoji: '🤝' },
  { value: 'customer_service', label: 'Customer Service', emoji: '⭐' },
  { value: 'above_and_beyond', label: 'Above & Beyond', emoji: '🚀' },
];

function ShoutoutModal({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('teamwork');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const fetchPosts = useFeedStore((s) => s.fetchPosts);

  useEffect(() => {
    api.get<User[]>('/users').then(({ data }) => {
      setUsers(data.filter((u) => u.id !== currentUserId));
    }).catch(() => {});
  }, [currentUserId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientId || !message.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/praise', { toUserId: recipientId, message, category });
      await fetchPosts();
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Send a Shoutout</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Select a person...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.displayName}</option>
            ))}
          </select>

          <div className="flex gap-2">
            {SHOUTOUT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  category === cat.value
                    ? 'bg-pink-50 border-pink-300 text-pink-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span className="block text-base mb-0.5">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What did they do that was awesome?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
          />
          <button
            type="submit"
            disabled={!recipientId || !message.trim() || isSubmitting}
            className="w-full py-2.5 bg-pink-600 text-white font-medium rounded-lg text-sm hover:bg-pink-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Sending...' : 'Send Shoutout'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function FeedView() {
  const { posts, scope, isLoading, hasMore, setScope, fetchPosts } = useFeedStore();
  const userRole = useAuthStore((s) => s.user?.role);
  const [showCreate, setShowCreate] = useState(false);
  const [showShoutout, setShowShoutout] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [scope, fetchPosts]);

  function loadMore() {
    if (posts.length > 0) {
      fetchPosts(posts[posts.length - 1].id);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Feed</h1>
        </div>

        {/* Scope toggle */}
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1 mb-5">
          <button
            onClick={() => setScope('all')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              scope === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Company
          </button>
          <button
            onClick={() => setScope('my-location')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              scope === 'my-location' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Location
          </button>
        </div>

        {/* Posts */}
        {isLoading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}

            {hasMore && posts.length > 0 && (
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="w-full py-2.5 text-sm text-emerald-600 font-medium hover:bg-emerald-50 rounded-lg transition-colors"
              >
                {isLoading ? 'Loading...' : 'Load more'}
              </button>
            )}

            {!isLoading && posts.length === 0 && (
              <p className="text-center text-gray-400 py-12">No posts yet</p>
            )}
          </div>
        )}
      </div>

      {/* FAB buttons */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 flex flex-col gap-3 z-30">
        <button
          onClick={() => setShowShoutout(true)}
          className="w-14 h-14 bg-pink-500 text-white rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-pink-600 transition-colors"
          title="Send Shoutout"
        >
          🌟
        </button>
        {userRole === 'manager' && (
          <button
            onClick={() => setShowCreate(true)}
            className="w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-emerald-700 transition-colors"
            title="New Post"
          >
            +
          </button>
        )}
      </div>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
      {showShoutout && <ShoutoutModal onClose={() => setShowShoutout(false)} />}
    </div>
  );
}
