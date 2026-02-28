import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUnreadStore } from '../../stores/unreadStore';

const tabs = [
  { key: 'home', label: 'Home', path: '/home' },
  { key: 'feed', label: 'Feed', path: '/feed' },
  { key: 'messages', label: 'Messages', path: '/messages' },
  { key: 'directory', label: 'Directory', path: '/directory' },
];

interface TopNavBarProps {
  onSearchClick: () => void;
}

export function TopNavBar({ onSearchClick }: TopNavBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const counts = useUnreadStore((s) => s.counts);

  const totalUnread = Object.values(counts).reduce((sum, c) => sum + c, 0);

  function isActive(path: string) {
    if (path === '/messages') {
      return location.pathname.startsWith('/messages');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  return (
    <header className="hidden md:flex h-14 bg-white border-b border-gray-200 items-center px-6 shrink-0">
      <span className="text-lg font-bold text-emerald-600 mr-8">Sona</span>

      <nav className="flex items-center gap-1">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                active
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.key === 'messages' && totalUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold px-1 min-w-[16px] h-4 flex items-center justify-center rounded-full">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search</span>
          <kbd className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">&#8984;K</kbd>
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{user?.displayName}</span>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
