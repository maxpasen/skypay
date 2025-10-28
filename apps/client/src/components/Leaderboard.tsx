import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { LeaderboardResponse, LeaderboardRange } from '@skipay/shared';

export function Leaderboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<LeaderboardRange>('all');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [range]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const result = await api.getLeaderboard(range);
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-blue-600">🏆 Leaderboard</h1>
          <button onClick={() => navigate('/')} className="btn-outline">
            ← Back
          </button>
        </div>

        <div className="card mb-6">
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setRange('daily')}
              className={range === 'daily' ? 'btn-primary' : 'btn-outline'}
            >
              Daily
            </button>
            <button
              onClick={() => setRange('weekly')}
              className={range === 'weekly' ? 'btn-primary' : 'btn-outline'}
            >
              Weekly
            </button>
            <button
              onClick={() => setRange('all')}
              className={range === 'all' ? 'btn-primary' : 'btn-outline'}
            >
              All Time
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card text-center py-12">
            <div className="text-2xl">Loading...</div>
          </div>
        ) : data && data.entries.length > 0 ? (
          <div className="card">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Rank</th>
                  <th className="text-left py-3">Player</th>
                  <th className="text-right py-3">Score</th>
                  <th className="text-right py-3">Distance</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr
                    key={entry.userId}
                    className={`border-b last:border-0 ${
                      data.yourEntry?.userId === entry.userId ? 'bg-blue-50 font-bold' : ''
                    }`}
                  >
                    <td className="py-3">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </td>
                    <td className="py-3">{entry.displayName}</td>
                    <td className="text-right py-3">{entry.score.toLocaleString()}</td>
                    <td className="text-right py-3">{Math.floor(entry.distance)}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="text-2xl mb-4">No entries yet</div>
            <p className="text-gray-600">Be the first to set a score!</p>
          </div>
        )}
      </div>
    </div>
  );
}
