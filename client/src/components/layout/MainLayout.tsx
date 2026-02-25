import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUnreadStore } from '../../stores/unreadStore';
import { connectSocket, disconnectSocket, getSocket } from '../../services/socket';
import { Sidebar } from './Sidebar';
import { ChannelView } from '../channels/ChannelView';
import { ConversationView } from '../dm/ConversationView';
import { SearchModal } from '../common/SearchModal';
import type { Message } from '../../types';

function UnreadTracker() {
  const { channelId, conversationId } = useParams();
  const incrementCount = useUnreadStore((s) => s.incrementCount);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleNewMessage(message: Message) {
      if (message.threadParentId) return;
      if (message.authorId === userId) return;

      if (message.channelId && message.channelId !== channelId) {
        incrementCount(message.channelId);
      }
      if (message.conversationId && message.conversationId !== conversationId) {
        incrementCount(message.conversationId);
      }
    }

    socket.on('message:new', handleNewMessage);
    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [channelId, conversationId, incrementCount, userId]);

  return null;
}

export function MainLayout() {
  const { isAuthenticated, loadUser } = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
      const token = localStorage.getItem('accessToken');
      if (token) {
        connectSocket(token);
      }
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, loadUser]);

  // Cmd+K / Ctrl+K to open search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowSearch((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile by default, shown as overlay when open */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          onSearchClick={() => { setShowSearch(true); setSidebarOpen(false); }}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with hamburger */}
        <div className="h-12 flex items-center px-3 border-b border-gray-200 bg-white md:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-2 font-semibold text-gray-900">Sona</span>
          <button
            onClick={() => setShowSearch(true)}
            className="ml-auto p-1.5 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        <Routes>
          <Route path="channels/:channelId" element={<><UnreadTracker /><ChannelView /></>} />
          <Route path="dm/:conversationId" element={<><UnreadTracker /><ConversationView /></>} />
          <Route
            path="*"
            element={
              <main className="flex-1 flex items-center justify-center text-gray-400 p-4">
                <UnreadTracker />
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-600 mb-2">Welcome to Sona</h2>
                  <p>Select a channel or start a conversation to begin messaging.</p>
                </div>
              </main>
            }
          />
        </Routes>
      </div>
    </div>
  );
}
