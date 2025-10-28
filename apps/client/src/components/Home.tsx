import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export function Home() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.sendMagicLink(email);
      setSent(true);
    } catch (error) {
      console.error(error);
      alert('Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-2xl w-full">
        <h1 className="text-5xl font-bold text-center mb-4 text-blue-600">
          ⛷️ SkiPay
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Ski down the endless slope, dodge obstacles, and beat your friends!
        </p>

        {!sent ? (
          <>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => navigate('/game?mode=solo')}
                className="btn-primary text-xl py-4"
              >
                🎮 Play Solo
              </button>

              <button
                onClick={() => navigate('/game?mode=quick')}
                className="btn-secondary text-xl py-4"
              >
                🏁 Quick Race (Multiplayer)
              </button>

              <button
                onClick={() => navigate('/leaderboard')}
                className="btn-outline"
              >
                🏆 Leaderboard
              </button>
            </div>

            <div className="mt-8 pt-8 border-t">
              <p className="text-center text-sm text-gray-600 mb-4">
                Login with magic link to save your progress
              </p>
              <form onSubmit={handleMagicLink} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Sending...' : 'Send Link'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">📧</div>
            <h2 className="text-2xl font-bold mb-2">Check your email!</h2>
            <p className="text-gray-600">
              We've sent a magic link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500 mt-4">
              (In development mode, check your server console for the link)
            </p>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Controls:</p>
          <p>← → or A/D: Steer | ↑ or W: Tuck | ↓ or S: Brake | Space: Jump</p>
        </div>
      </div>
    </div>
  );
}
