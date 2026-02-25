import { create } from 'zustand';
import api from '../services/api';
import type { Message, ReactionData } from '../types';

interface MessageState {
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  fetchMessages: (channelId: string, cursor?: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  updateReplyCount: (parentMessageId: string, replyCount: number) => void;
  updateReactions: (messageId: string, reactions: ReactionData[]) => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  isLoading: false,
  hasMore: true,

  fetchMessages: async (channelId: string, cursor?: string) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      params.set('limit', '50');

      const { data } = await api.get<Message[]>(
        `/channels/${channelId}/messages?${params.toString()}`
      );

      if (cursor) {
        // Prepend older messages
        set({ messages: [...data, ...get().messages], hasMore: data.length === 50, isLoading: false });
      } else {
        set({ messages: data, hasMore: data.length === 50, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  addMessage: (message) => {
    set({ messages: [...get().messages, message] });
  },

  updateMessage: (message) => {
    set({
      messages: get().messages.map((m) => (m.id === message.id ? message : m)),
    });
  },

  removeMessage: (messageId) => {
    set({
      messages: get().messages.filter((m) => m.id !== messageId),
    });
  },

  updateReplyCount: (parentMessageId, replyCount) => {
    set({
      messages: get().messages.map((m) =>
        m.id === parentMessageId
          ? { ...m, _count: { ...m._count, threadReplies: replyCount } }
          : m
      ),
    });
  },

  updateReactions: (messageId, reactions) => {
    set({
      messages: get().messages.map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      ),
    });
  },

  clearMessages: () => set({ messages: [], hasMore: true }),
}));
