import { create } from 'zustand';
import api from '../services/api';
import type { Message, ThreadData } from '../types';

interface ThreadState {
  parentMessage: Message | null;
  replies: Message[];
  isOpen: boolean;
  isLoading: boolean;
  openThread: (messageId: string) => Promise<void>;
  closeThread: () => void;
  addReply: (reply: Message) => void;
  updateReply: (reply: Message) => void;
  removeReply: (messageId: string) => void;
}

export const useThreadStore = create<ThreadState>((set, get) => ({
  parentMessage: null,
  replies: [],
  isOpen: false,
  isLoading: false,

  openThread: async (messageId: string) => {
    set({ isOpen: true, isLoading: true, replies: [], parentMessage: null });
    try {
      const { data } = await api.get<ThreadData>(`/messages/${messageId}/thread`);
      set({ parentMessage: data.parent, replies: data.replies, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  closeThread: () => {
    set({ isOpen: false, parentMessage: null, replies: [] });
  },

  addReply: (reply: Message) => {
    const { parentMessage } = get();
    if (parentMessage && reply.threadParentId === parentMessage.id) {
      set({ replies: [...get().replies, reply] });
    }
  },

  updateReply: (reply: Message) => {
    set({
      replies: get().replies.map((r) => (r.id === reply.id ? reply : r)),
    });
  },

  removeReply: (messageId: string) => {
    set({
      replies: get().replies.filter((r) => r.id !== messageId),
    });
  },
}));
