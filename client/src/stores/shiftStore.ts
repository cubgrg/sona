import { create } from 'zustand';
import api from '../services/api';
import type { Shift } from '../types';

interface ShiftState {
  nextShift: Shift | null;
  weekShifts: Shift[];
  isLoading: boolean;
  error: string | null;
  fetchNextShift: () => Promise<void>;
  fetchWeekShifts: () => Promise<void>;
}

export const useShiftStore = create<ShiftState>((set) => ({
  nextShift: null,
  weekShifts: [],
  isLoading: false,
  error: null,

  fetchNextShift: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Shift | null>('/shifts/me/next');
      set({ nextShift: data, isLoading: false });
    } catch {
      set({ error: 'Failed to load next shift', isLoading: false });
    }
  },

  fetchWeekShifts: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Shift[]>('/shifts/me/week');
      set({ weekShifts: data, isLoading: false });
    } catch {
      set({ error: 'Failed to load week shifts', isLoading: false });
    }
  },
}));
