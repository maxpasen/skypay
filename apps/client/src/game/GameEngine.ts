import type { ServerSnapshot, PlayerSnapshot } from '@skipay/shared';
import { InputManager } from './Input.js';
import { Renderer } from './Renderer.js';
import { WebSocketClient } from './WebSocketClient.js';

interface PredictedState {
  tick: number;
  seq: number;
  player: PlayerSnapshot;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private inputManager: InputManager;
  private wsClient: WebSocketClient | null = null;

  private running = false;
  private lastFrameTime = 0;
  private currentTick = 0;
  private inputSeq = 0;

  // Client prediction
  private predictedStates: PredictedState[] = [];

  // Game state
  private myPlayerId: string | null = null;
  private players: Map<string, PlayerSnapshot> = new Map();

  private onScoreUpdate?: (score: number, distance: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.inputManager = new InputManager();

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.renderer.resize(this.canvas.width, this.canvas.height);
  }

  setOnScoreUpdate(callback: (score: number, distance: number) => void) {
    this.onScoreUpdate = callback;
  }

  connectMultiplayer(token: string, mode: string, roomCode?: string) {
    // Auto-detect WebSocket URL based on current location
    const wsUrl = import.meta.env.VITE_WS_URL || (() => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws`;
    })();

    this.wsClient = new WebSocketClient(wsUrl, {
      onWelcome: (msg) => {
        console.log('Welcome:', msg);
        this.myPlayerId = msg.playerId;

        // Start game loop
        this.start();
      },
      onSnapshot: (msg) => {
        this.handleSnapshot(msg);
      },
      onError: (msg) => {
        console.error('Server error:', msg);
      },
      onConnectionChange: (status) => {
        console.log('Connection status:', status);
      },
    });

    this.wsClient.connect(token, mode, roomCode);
  }

  private handleSnapshot(snapshot: ServerSnapshot) {
    // Update players
    this.players.clear();
    for (const player of snapshot.players) {
      this.players.set(player.id, player);
    }

    // Client-side reconciliation
    if (this.myPlayerId) {
      const serverPlayer = this.players.get(this.myPlayerId);

      if (serverPlayer && snapshot.you) {
        // Remove acknowledged predictions
        this.predictedStates = this.predictedStates.filter(
          (state) => state.seq > snapshot.you.ackSeq
        );

        // Update score
        this.onScoreUpdate?.(serverPlayer.score, serverPlayer.distance);
      }
    }
  }

  start() {
    if (this.running) return;

    this.running = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  stop() {
    this.running = false;
    if (this.wsClient) {
      this.wsClient.disconnect();
    }
  }

  private gameLoop = () => {
    if (!this.running) return;

    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number) {
    // Get input
    const inputState = this.inputManager.getState();

    // Send input to server
    if (this.wsClient && this.myPlayerId) {
      this.inputSeq++;
      this.currentTick++;

      const intent = {
        steer: inputState.steer,
        brake: inputState.brake ? 1 : 0,
        tuck: inputState.tuck ? 1 : 0,
        jump: inputState.jump ? 1 : 0,
      };

      this.wsClient.sendInput(this.inputSeq, this.currentTick, dt * 1000, intent);

      // Client prediction (simplified - just store input for reconciliation)
      const myPlayer = this.players.get(this.myPlayerId);
      if (myPlayer) {
        this.predictedStates.push({
          tick: this.currentTick,
          seq: this.inputSeq,
          player: { ...myPlayer },
        });

        // Limit prediction history
        if (this.predictedStates.length > 60) {
          this.predictedStates.shift();
        }
      }
    }
  }

  private render() {
    this.renderer.clear();

    // Draw snow
    this.renderer.drawSnowTrail();

    // Update camera to follow player
    if (this.myPlayerId) {
      const myPlayer = this.players.get(this.myPlayerId);
      if (myPlayer) {
        this.renderer.updateCamera(myPlayer);
      }
    }

    // Draw players
    for (const [id, player] of this.players) {
      this.renderer.drawPlayer(player, id === this.myPlayerId);
    }

    // Draw objects (would need to be synced from server)
    // For now, objects are not rendered on client
  }

  setTouchInput(button: 'left' | 'right' | 'jump' | 'tuck' | 'brake', pressed: boolean) {
    this.inputManager.setTouch(button, pressed);
  }
}
