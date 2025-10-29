import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GameEngine } from '../game/GameEngine';
import { useStore } from '../lib/store';

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { score, distance, setGameStats, setIsPlaying } = useStore();
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');

  const mode = searchParams.get('mode') || 'solo';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    engine.setOnScoreUpdate((score, distance) => {
      setGameStats(score, distance);
    });

    setIsPlaying(true);

    if (mode === 'quick' || mode === 'friends') {
      // Get token from cookie, or use 'guest' for anonymous play
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1] || 'guest';

      // Map URL mode to server MatchMode enum
      const serverMode = mode === 'quick' ? 'race' : mode;

      engine.connectMultiplayer(token, serverMode);
      setConnectionStatus(token === 'guest' ? 'Guest Mode' : 'Connected');
    } else {
      // Solo mode - just start the game loop
      engine.start();
      setConnectionStatus('Solo Mode');
    }

    return () => {
      engine.stop();
      setIsPlaying(false);
    };
  }, [mode, navigate, setGameStats, setIsPlaying]);

  // Touch controls
  const handleTouch = (button: any, pressed: boolean) => {
    engineRef.current?.setTouchInput(button, pressed);
  };

  const handleBack = () => {
    engineRef.current?.stop();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-400 to-white">
      {/* HUD */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-black/50 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex gap-6">
            <div>
              <div className="text-xs opacity-75">Score</div>
              <div className="text-2xl font-bold">{score.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs opacity-75">Distance</div>
              <div className="text-2xl font-bold">{Math.floor(distance)}m</div>
            </div>
          </div>

          <div className="text-sm">
            <div className="opacity-75">{connectionStatus}</div>
          </div>

          <button onClick={handleBack} className="btn-outline text-white border-white hover:bg-white/20">
            Exit
          </button>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>

      {/* Mobile Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-10 p-4 md:hidden">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex gap-2">
            <button
              onTouchStart={() => handleTouch('left', true)}
              onTouchEnd={() => handleTouch('left', false)}
              className="btn-primary w-16 h-16 text-2xl"
            >
              ←
            </button>
            <button
              onTouchStart={() => handleTouch('right', true)}
              onTouchEnd={() => handleTouch('right', false)}
              className="btn-primary w-16 h-16 text-2xl"
            >
              →
            </button>
          </div>

          <button
            onTouchStart={() => handleTouch('jump', true)}
            onTouchEnd={() => handleTouch('jump', false)}
            className="btn-secondary w-20 h-20 text-xl"
          >
            Jump
          </button>
        </div>
      </div>
    </div>
  );
}
