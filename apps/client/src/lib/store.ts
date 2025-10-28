import { create } from 'zustand';
import type { UserResponse } from '@skipay/shared';

interface AppState {
  user: UserResponse | null;
  setUser: (user: UserResponse | null) => void;

  score: number;
  distance: number;
  setGameStats: (score: number, distance: number) => void;

  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  score: 0,
  distance: 0,
  setGameStats: (score, distance) => set({ score, distance }),

  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
}));
