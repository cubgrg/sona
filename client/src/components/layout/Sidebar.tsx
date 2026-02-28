import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useChannelStore } from '../../stores/channelStore';
import { useConversationStore } from '../../stores/conversationStore';
import { useUnreadStore } from '../../stores/unreadStore';
import { CreateChannelModal } from '../channels/CreateChannelModal';
import { NewDMModal } from '../dm/NewDMModal';

interface SidebarProps {
  onSearchClick?: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ onSearchClick, onNavigate }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { channels, fetchChannels } = useChannelStore();
  const { conversations, fetchConversations } = useConversationStore();
  const { counts: unreadCounts, fetchUnreadCounts } = useUnreadStore();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const navigate = useNavigate();
  const { channelId, conversationId } = useParams();
  const location = useLocation();

  useEffect(() => {
    fetchChannels();
    fetchConversations();
    fetchUnreadCounts();
  }, [fetchChannels, fetchConversations, fetchUnreadCounts]);

  function handleChannelCreated(id: string) {
    setShowCreateChannel(false);
    navigate(`/messages/channels/${id}`);
    onNavigate?.();
  }

  function getOtherMember(conv: typeof conversations[0]) {
    const other = conv.members.find((m) => m.userId !== user?.id);
    return other?.user;
  }

  return (
    <>
      <aside className="w-64 h-full bg-emerald-900 text-white flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-emerald-800">
          <h1 className="text-lg font-bold">Sona</h1>
          <p className="text-emerald-300 text-sm truncate">{user?.displayName}</p>
        </div>

        {/* Search */}
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="mx-3 mt-3 flex items-center gap-2 px-3 py-1.5 bg-emerald-800/50 hover:bg-emerald-800 rounded-lg text-sm text-emerald-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="flex-1 text-left">Search</span>
            <kbd className="text-xs text-emerald-400 bg-emerald-900/50 px-1.5 py-0.5 rounded">&#8984;K</kbd>
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {/* Channels */}
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              Channels
            </span>
            <button
              onClick={() => setShowCreateChannel(true)}
              className="text-emerald-400 hover:text-white text-lg leading-none"
              title="Create channel"
            >
              +
            </button>
          </div>

          {channels.length === 0 && (
            <p className="text-emerald-300 text-sm px-2 py-1">No channels yet</p>
          )}

          <ul className="space-y-0.5">
            {channels.map((ch) => {
              const unread = unreadCounts[ch.id] || 0;
              return (
                <li key={ch.id}>
                  <button
                    onClick={() => { navigate(`/messages/channels/${ch.id}`); onNavigate?.(); }}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center justify-between ${
                      channelId === ch.id
                        ? 'bg-emerald-800 text-white'
                        : unread > 0
                          ? 'text-white font-semibold hover:bg-emerald-800/50'
                          : 'text-emerald-200 hover:bg-emerald-800/50 hover:text-white'
                    }`}
                  >
                    <span>
                      <span className="text-emerald-400 mr-1">#</span>
                      {ch.name}
                    </span>
                    {unread > 0 && channelId !== ch.id && (
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Direct Messages */}
          <div className="flex items-center justify-between px-2 py-1 mb-1 mt-6">
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              Direct Messages
            </span>
            <button
              onClick={() => setShowNewDM(true)}
              className="text-emerald-400 hover:text-white text-lg leading-none"
              title="New message"
            >
              +
            </button>
          </div>

          {conversations.length === 0 && (
            <p className="text-emerald-300 text-sm px-2 py-1">No conversations yet</p>
          )}

          <ul className="space-y-0.5">
            {conversations.map((conv) => {
              const other = getOtherMember(conv);
              if (!other) return null;

              const isActive =
                conversationId === conv.id || location.pathname === `/messages/dm/${conv.id}`;
              const lastMsg = conv.messages?.[0];
              const unread = unreadCounts[conv.id] || 0;

              return (
                <li key={conv.id}>
                  <button
                    onClick={() => { navigate(`/messages/dm/${conv.id}`); onNavigate?.(); }}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                      isActive
                        ? 'bg-emerald-800 text-white'
                        : unread > 0
                          ? 'text-white font-semibold hover:bg-emerald-800/50'
                          : 'text-emerald-200 hover:bg-emerald-800/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${other.status === 'online' ? 'bg-green-400' : 'bg-gray-500'}`} />
                      <span className="truncate flex-1">{other.displayName}</span>
                      {unread > 0 && !isActive && (
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {unread}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-xs text-emerald-400 truncate mt-0.5 pl-4">
                        {lastMsg.content}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-emerald-800">
          <button
            onClick={logout}
            className="w-full text-left text-emerald-300 hover:text-white text-sm px-2 py-1 rounded hover:bg-emerald-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {showCreateChannel && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onCreated={handleChannelCreated}
        />
      )}

      {showNewDM && (
        <NewDMModal onClose={() => setShowNewDM(false)} />
      )}
    </>
  );
}
