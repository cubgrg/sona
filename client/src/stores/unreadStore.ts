import { create } from 'zustand';
import api from '../services/api';

interface UnreadState {
  counts: Record<string, number>;
  fetchUnreadCounts: () => Promise<void>;
  markAsRead: (id: string, lastReadMessageId: string, type: 'channel' | 'conversation') => Promise<void>;
  incrementCount: (id: string) => void;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  counts: {},

  fetchUnreadCounts: async () => {
    try {
      const { data } = await api.get<Record<string, number>>('/unread');
      set({ counts: data });
    } catch {
      // silently fail
    }
  },

  markAsRead: async (id: string, lastReadMessageId: string, type: 'channel' | 'conversation') => {
    // Optimistically clear the count
    const updated = { ...get().counts };
    delete updated[id];
    set({ counts: updated });

    try {
      await api.post('/read', {
        [type === 'channel' ? 'channelId' : 'conversationId']: id,
        lastReadMessageId,
      });
    } catch {
      // revert on failure by refetching
      get().fetchUnreadCounts();
    }
  },

  incrementCount: (id: string) => {
    const counts = { ...get().counts };
    counts[id] = (counts[id] || 0) + 1;
    set({ counts });
  },
}));
