import { create } from 'zustand';
import api from '../services/api';
import type { FeedPost, FeedReaction } from '../types';

interface FeedState {
  posts: FeedPost[];
  scope: 'all' | 'my-location';
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  setScope: (scope: 'all' | 'my-location') => void;
  fetchPosts: (cursor?: string) => Promise<void>;
  createPost: (data: { type: string; title?: string; content: string; imageUrl?: string; locationScope?: string }) => Promise<FeedPost>;
  addPost: (post: FeedPost) => void;
  removePost: (postId: string) => void;
  deletePost: (postId: string) => Promise<void>;
  updateReactions: (postId: string, reactions: FeedReaction[]) => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  scope: 'all',
  isLoading: false,
  hasMore: true,
  error: null,

  setScope: (scope) => {
    set({ scope, posts: [], hasMore: true });
  },

  fetchPosts: async (cursor?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.set('scope', get().scope);
      params.set('limit', '20');
      if (cursor) params.set('cursor', cursor);

      const { data } = await api.get<FeedPost[]>(`/feed?${params.toString()}`);

      if (cursor) {
        set({ posts: [...get().posts, ...data], hasMore: data.length === 20, isLoading: false });
      } else {
        set({ posts: data, hasMore: data.length === 20, isLoading: false });
      }
    } catch {
      set({ error: 'Failed to load feed', isLoading: false });
    }
  },

  createPost: async (postData) => {
    const { data } = await api.post<FeedPost>('/feed', postData);
    set({ posts: [data, ...get().posts] });
    return data;
  },

  addPost: (post) => {
    // Avoid duplicates (e.g. from socket + own creation)
    if (get().posts.some((p) => p.id === post.id)) return;
    set({ posts: [post, ...get().posts] });
  },

  removePost: (postId) => {
    set({ posts: get().posts.filter((p) => p.id !== postId) });
  },

  deletePost: async (postId) => {
    await api.delete(`/feed/${postId}`);
    get().removePost(postId);
  },

  updateReactions: (postId, reactions) => {
    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, reactions } : p
      ),
    });
  },
}));
