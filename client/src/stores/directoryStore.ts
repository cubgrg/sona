import { create } from 'zustand';
import api from '../services/api';
import type { User, Location } from '../types';

interface DirectoryState {
  employees: User[];
  locations: Location[];
  searchQuery: string;
  locationFilter: string;
  isLoading: boolean;
  error: string | null;
  setSearchQuery: (query: string) => void;
  setLocationFilter: (locationId: string) => void;
  fetchEmployees: () => Promise<void>;
  fetchLocations: () => Promise<void>;
  filteredEmployees: () => User[];
}

export const useDirectoryStore = create<DirectoryState>((set, get) => ({
  employees: [],
  locations: [],
  searchQuery: '',
  locationFilter: '',
  isLoading: false,
  error: null,

  setSearchQuery: (query) => set({ searchQuery: query }),

  setLocationFilter: (locationId) => set({ locationFilter: locationId }),

  fetchEmployees: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<User[]>('/users');
      set({ employees: data, isLoading: false });
    } catch {
      set({ error: 'Failed to load employees', isLoading: false });
    }
  },

  fetchLocations: async () => {
    try {
      const { data } = await api.get<Location[]>('/locations');
      set({ locations: data });
    } catch {
      set({ error: 'Failed to load locations' });
    }
  },

  filteredEmployees: () => {
    const { employees, searchQuery, locationFilter } = get();
    return employees.filter((e) => {
      const matchesSearch = !searchQuery ||
        e.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = !locationFilter || e.locationId === locationFilter;
      return matchesSearch && matchesLocation;
    });
  },
}));
