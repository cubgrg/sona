import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { connectSocket, disconnectSocket } from '../../services/socket';
import { SearchModal } from '../common/SearchModal';
import { TopNavBar } from './TopNavBar';
import { BottomTabBar } from './BottomTabBar';
import { MainLayout } from './MainLayout';
import { HomeDashboard } from '../home/HomeDashboard';
import { FeedView } from '../feed/FeedView';
import { DirectoryView } from '../directory/DirectoryView';

export function AppShell() {
  const { isAuthenticated, loadUser } = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);

  // Socket connection (moved from MainLayout)
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

  // Cmd+K / Ctrl+K to open search (moved from MainLayout)
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
    <div className="h-screen flex flex-col bg-gray-100">
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      {/* Desktop top nav */}
      <TopNavBar onSearchClick={() => setShowSearch(true)} />

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        <Routes>
          <Route path="/home" element={<HomeDashboard />} />
          <Route path="/feed" element={<FeedView />} />
          <Route path="/messages/*" element={<MainLayout />} />
          <Route path="/directory" element={<DirectoryView />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>

      {/* Bottom tab bar (mobile only) */}
      <BottomTabBar />
    </div>
  );
}
