import { create } from 'zustand';
import api from '../services/api';
import type { DashboardData } from '../types';

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<DashboardData>('/dashboard');
      set({ data, isLoading: false });
    } catch {
      set({ error: 'Failed to load dashboard', isLoading: false });
    }
  },
}));
