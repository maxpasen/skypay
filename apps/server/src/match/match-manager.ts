import { GAME_CONSTANTS, PlayerState, MatchMode, MatchStatus } from '@skipay/shared';
import { PhysicsEngine } from '../physics/engine.js';
import { MapGenerator } from '../physics/map-generator.js';
import type { PlayerPhysics, PlayerIntent } from '../physics/types.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/db.js';

export interface MatchPlayer {
  id: string;
  userId: string;
  displayName: string;
  physics: PlayerPhysics;
  lastAckedSeq: number;
  inputQueue: Array<{ seq: number; intent: PlayerIntent; timestamp: number }>;
  connected: boolean;
}

export class Match {
  public id: string;
  public mode: MatchMode;
  public seed: number;
  public status: MatchStatus;
  public tickRate: number;
  public maxPlayers: number;

  private players: Map<string, MatchPlayer>;
  private physicsEngine: PhysicsEngine;
  private mapGenerator: MapGenerator;
  private currentTick: number;
  private tickInterval: NodeJS.Timeout | null;

  constructor(
    id: string,
    mode: MatchMode,
    seed: number,
    tickRate: number = GAME_CONSTANTS.SERVER_TICK_RATE,
    maxPlayers: number = GAME_CONSTANTS.MAX_PLAYERS_PER_MATCH
  ) {
    this.id = id;
    this.mode = mode;
    this.seed = seed;
    this.status = MatchStatus.LOBBY;
    this.tickRate = tickRate;
    this.maxPlayers = maxPlayers;

    this.players = new Map();
    this.physicsEngine = new PhysicsEngine();
    this.mapGenerator = new MapGenerator(seed);
    this.currentTick = 0;
    this.tickInterval = null;
  }

  /**
   * Add a player to the match
   */
  addPlayer(playerId: string, userId: string, displayName: string): boolean {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }

    if (this.players.has(playerId)) {
      return false;
    }

    const player: MatchPlayer = {
      id: playerId,
      userId,
      displayName,
      physics: {
        id: playerId,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: GAME_CONSTANTS.MIN_SPEED },
        state: PlayerState.SKIING,
        distance: 0,
        score: 0,
        speed: GAME_CONSTANTS.MIN_SPEED,
        airborneTime: 0,
        effectExpiry: new Map(),
        lastJumpY: 0,
      },
      lastAckedSeq: -1,
      inputQueue: [],
      connected: true,
    };

    this.players.set(playerId, player);
    logger.info({ matchId: this.id, playerId }, 'Player joined match');

    return true;
  }

  /**
   * Remove a player from the match
   */
  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.connected = false;
      logger.info({ matchId: this.id, playerId }, 'Player left match');
    }
  }

  /**
   * Queue player input
   */
  queueInput(playerId: string, seq: number, intent: PlayerIntent, timestamp: number): void {
    const player = this.players.get(playerId);
    if (!player) return;

    player.inputQueue.push({ seq, intent, timestamp });

    // Keep only recent inputs (prevent memory leak)
    if (player.inputQueue.length > GAME_CONSTANTS.INPUT_BUFFER_SIZE) {
      player.inputQueue.shift();
    }
  }

  /**
   * Start the match
   */
  start(): void {
    if (this.status !== MatchStatus.LOBBY) {
      return;
    }

    this.status = MatchStatus.ACTIVE;
    this.currentTick = 0;

    // Start tick loop
    const tickDuration = 1000 / this.tickRate;
    this.tickInterval = setInterval(() => {
      this.tick();
    }, tickDuration);

    logger.info({ matchId: this.id, players: this.players.size }, 'Match started');
  }

  /**
   * Process one game tick
   */
  private tick(): void {
    this.currentTick++;
    const dt = 1 / this.tickRate;
    const serverTime = Date.now();

    const allEvents: any[] = [];

    // Process each player
    for (const [_playerId, player] of this.players.entries()) {
      if (!player.connected) continue;

      // Get latest input from queue
      let intent: PlayerIntent = { steer: 0, brake: 0, tuck: 0, jump: 0 };

      if (player.inputQueue.length > 0) {
        const latestInput = player.inputQueue[player.inputQueue.length - 1];
        intent = latestInput.intent;
        player.lastAckedSeq = latestInput.seq;

        // Clear old inputs
        player.inputQueue = player.inputQueue.filter((input) => input.seq >= player.lastAckedSeq);
      }

      // Get nearby objects
      const nearbyObjects = this.mapGenerator.getObjectsNear(
        player.physics.position.x,
        player.physics.position.y,
        GAME_CONSTANTS.OBSTACLE_CHECK_RADIUS
      );

      // Update physics
      const { events } = this.physicsEngine.updatePlayer(
        player.physics,
        intent,
        dt,
        nearbyObjects,
        serverTime
      );

      allEvents.push(...events);
    }

    // Check if match should end
    const activePlayers = Array.from(this.players.values()).filter(
      (p) => p.connected && p.physics.state !== PlayerState.CRASHED
    );

    if (activePlayers.length === 0 && this.players.size > 0) {
      this.end();
    }
  }

  /**
   * End the match
   */
  async end(): Promise<void> {
    if (this.status === MatchStatus.COMPLETE) {
      return;
    }

    this.status = MatchStatus.COMPLETE;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // Calculate final results
    const results = Array.from(this.players.values())
      .sort((a, b) => b.physics.score - a.physics.score)
      .map((player, index) => ({
        playerId: player.id,
        userId: player.userId,
        displayName: player.displayName,
        placement: index + 1,
        score: player.physics.score,
        distance: player.physics.distance,
      }));

    // Persist to database
    try {
      await prisma.match.update({
        where: { id: this.id },
        data: {
          status: MatchStatus.COMPLETE,
          endedAt: new Date(),
        },
      });

      // Update match players
      for (const result of results) {
        await prisma.matchPlayer.updateMany({
          where: {
            matchId: this.id,
            userId: result.userId,
          },
          data: {
            finalScore: result.score,
            finalDistance: result.distance,
            placement: result.placement,
          },
        });
      }
    } catch (error) {
      logger.error({ error, matchId: this.id }, 'Failed to persist match results');
    }

    logger.info({ matchId: this.id, results }, 'Match ended');
  }

  /**
   * Get current game state
   */
  getState() {
    return {
      tick: this.currentTick,
      serverTime: Date.now(),
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        displayName: p.displayName,
        x: p.physics.position.x,
        y: p.physics.position.y,
        vx: p.physics.velocity.x,
        vy: p.physics.velocity.y,
        state: p.physics.state,
        distance: p.physics.distance,
        score: p.physics.score,
      })),
    };
  }

  /**
   * Get player count
   */
  getPlayerCount(): number {
    return this.players.size;
  }

  /**
   * Get player info
   */
  getPlayers() {
    return Array.from(this.players.values()).map((p) => ({
      id: p.id,
      displayName: p.displayName,
    }));
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): MatchPlayer | undefined {
    return this.players.get(playerId);
  }
}

export class MatchManager {
  private matches: Map<string, Match>;

  constructor() {
    this.matches = new Map();
  }

  /**
   * Create a new match
   */
  createMatch(id: string, mode: MatchMode, seed: number, tickRate?: number, maxPlayers?: number): Match {
    const match = new Match(id, mode, seed, tickRate, maxPlayers);
    this.matches.set(id, match);
    return match;
  }

  /**
   * Get a match by ID
   */
  getMatch(id: string): Match | undefined {
    return this.matches.get(id);
  }

  /**
   * Remove a match
   */
  removeMatch(id: string): void {
    const match = this.matches.get(id);
    if (match) {
      match.end();
      this.matches.delete(id);
    }
  }

  /**
   * Find an available match for quick play
   */
  findAvailableMatch(mode: MatchMode): Match | null {
    for (const match of this.matches.values()) {
      if (
        match.mode === mode &&
        match.status === MatchStatus.LOBBY &&
        match.getPlayerCount() < match.maxPlayers
      ) {
        return match;
      }
    }
    return null;
  }

  /**
   * Get all matches
   */
  getAllMatches(): Match[] {
    return Array.from(this.matches.values());
  }
}
