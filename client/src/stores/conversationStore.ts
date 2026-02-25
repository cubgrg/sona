import { create } from 'zustand';
import api from '../services/api';
import type { Conversation } from '../types';

interface ConversationState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  isLoading: boolean;
  fetchConversations: () => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  startConversation: (recipientId: string) => Promise<Conversation>;
  setActiveConversation: (conversation: Conversation | null) => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  isLoading: false,

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Conversation[]>('/conversations');
      set({ conversations: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchConversation: async (id: string) => {
    try {
      const { data } = await api.get<Conversation>(`/conversations/${id}`);
      set({ activeConversation: data });
    } catch {
      // handled silently
    }
  },

  startConversation: async (recipientId: string) => {
    const { data } = await api.post<Conversation>('/conversations', { recipientId });
    const existing = get().conversations.find((c) => c.id === data.id);
    if (!existing) {
      set({ conversations: [data, ...get().conversations] });
    }
    return data;
  },

  setActiveConversation: (conversation) => set({ activeConversation: conversation }),
}));
