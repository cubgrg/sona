import { useLocation, useNavigate } from 'react-router-dom';
import { useUnreadStore } from '../../stores/unreadStore';

const tabs = [
  {
    key: 'home',
    label: 'Home',
    path: '/home',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    key: 'feed',
    label: 'Feed',
    path: '/feed',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
  {
    key: 'messages',
    label: 'Messages',
    path: '/messages',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    key: 'directory',
    label: 'Directory',
    path: '/directory',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const counts = useUnreadStore((s) => s.counts);

  const totalUnread = Object.values(counts).reduce((sum, c) => sum + c, 0);

  function isActive(path: string) {
    if (path === '/messages') {
      return location.pathname.startsWith('/messages');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  return (
    <nav className="h-14 bg-white border-t border-gray-200 flex items-center justify-around shrink-0 md:hidden">
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors ${
              active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium">{tab.label}</span>
            {tab.key === 'messages' && totalUnread > 0 && (
              <span className="absolute top-1.5 right-1/2 translate-x-4 bg-red-500 text-white text-[9px] font-bold px-1 min-w-[16px] h-4 flex items-center justify-center rounded-full">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
