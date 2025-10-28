import type { UserResponse, LeaderboardResponse, LeaderboardRange } from '@skipay/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const api = {
  async sendMagicLink(email: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) throw new Error('Failed to send magic link');
    return res.json();
  },

  async getMe(): Promise<UserResponse> {
    const res = await fetch(`${API_BASE}/me`, {
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Failed to get user');
    return res.json();
  },

  async getLeaderboard(range: LeaderboardRange): Promise<LeaderboardResponse> {
    const res = await fetch(`${API_BASE}/leaderboard?range=${range}`);

    if (!res.ok) throw new Error('Failed to get leaderboard');
    return res.json();
  },

  async submitRun(data: any): Promise<{ success: boolean; runId: string }> {
    const res = await fetch(`${API_BASE}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to submit run');
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};
