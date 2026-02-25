import { create } from 'zustand';
import api from '../services/api';
import type { Channel, ChannelDetail } from '../types';

interface ChannelState {
  channels: Channel[];
  activeChannel: ChannelDetail | null;
  isLoading: boolean;
  error: string | null;
  fetchChannels: () => Promise<void>;
  fetchChannel: (id: string) => Promise<void>;
  createChannel: (name: string, description?: string) => Promise<Channel>;
  joinChannel: (id: string) => Promise<void>;
  leaveChannel: (id: string) => Promise<void>;
  setActiveChannel: (channel: ChannelDetail | null) => void;
  clearError: () => void;
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  activeChannel: null,
  isLoading: false,
  error: null,

  fetchChannels: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Channel[]>('/channels');
      set({ channels: data, isLoading: false });
    } catch {
      set({ error: 'Failed to load channels', isLoading: false });
    }
  },

  fetchChannel: async (id: string) => {
    try {
      const { data } = await api.get<ChannelDetail>(`/channels/${id}`);
      set({ activeChannel: data });
    } catch {
      set({ error: 'Failed to load channel' });
    }
  },

  createChannel: async (name: string, description?: string) => {
    const { data } = await api.post<Channel>('/channels', { name, description });
    set({ channels: [...get().channels, data] });
    return data;
  },

  joinChannel: async (id: string) => {
    await api.post(`/channels/${id}/join`);
    await get().fetchChannels();
  },

  leaveChannel: async (id: string) => {
    await api.post(`/channels/${id}/leave`);
    set({
      channels: get().channels.filter((c) => c.id !== id),
      activeChannel: get().activeChannel?.id === id ? null : get().activeChannel,
    });
  },

  setActiveChannel: (channel) => set({ activeChannel: channel }),

  clearError: () => set({ error: null }),
}));
