import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { FastifyInstance } from 'fastify';
import {
  ClientMessageSchema,
  ServerWelcome,
  ServerSnapshot,
  ServerError,
  MatchMode,
  MatchStatus,
} from '@skipay/shared';
import { MatchManager } from '../match/match-manager.js';
import { prisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { nanoid } from 'nanoid';

interface AuthenticatedWebSocket extends WebSocket {
  playerId?: string;
  userId?: string;
  matchId?: string;
  isAlive?: boolean;
}

export class WebSocketServerManager {
  private wss: WebSocketServer;
  private matchManager: MatchManager;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.matchManager = new MatchManager();

    // Create WebSocket server
    this.wss = new WebSocketServer({
      noServer: true,
    });

    this.wss.on('connection', this.handleConnection.bind(this));

    // Heartbeat to detect dead connections
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const socket = ws as AuthenticatedWebSocket;
        if (socket.isAlive === false) {
          return socket.terminate();
        }
        socket.isAlive = false;
        socket.ping();
      });
    }, 30000);

    logger.info('WebSocket server initialized');
  }

  /**
   * Handle WebSocket upgrade
   */
  handleUpgrade(request: IncomingMessage, socket: any, head: Buffer) {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Validate message
        const parsed = ClientMessageSchema.safeParse(message);
        if (!parsed.success) {
          this.sendError(ws, 'invalid_message', 'Invalid message format');
          return;
        }

        const validMessage = parsed.data;

        // Handle message types
        switch (validMessage.type) {
          case 'auth':
            await this.handleAuth(ws, validMessage.token, validMessage.mode, validMessage.roomCode);
            break;

          case 'input':
            this.handleInput(ws, validMessage);
            break;

          case 'ping':
            ws.send(
              JSON.stringify({
                type: 'pong',
                clientTime: validMessage.clientTime,
                serverTime: Date.now(),
              })
            );
            break;
        }
      } catch (error) {
        logger.error({ error }, 'WebSocket message error');
        this.sendError(ws, 'server_error', 'Internal server error');
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      logger.error({ error }, 'WebSocket error');
    });
  }

  /**
   * Handle authentication
   */
  private async handleAuth(
    ws: AuthenticatedWebSocket,
    token: string,
    mode: MatchMode,
    roomCode?: string
  ) {
    try {
      // Verify JWT
      const decoded = this.fastify.jwt.verify(token) as { sub: string; email: string };

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user) {
        this.sendError(ws, 'auth_failed', 'User not found');
        ws.close();
        return;
      }

      ws.userId = user.id;
      ws.playerId = nanoid();

      logger.info({ userId: user.id, playerId: ws.playerId, mode }, 'Player authenticated');

      // Find or create match
      let match;

      if (mode === MatchMode.QUICK_RACE) {
        // Find available match or create new one
        match = this.matchManager.findAvailableMatch(mode);

        if (!match) {
          const matchId = nanoid();
          const seed = Math.floor(Math.random() * 1000000);

          // Create match in database
          const dbMatch = await prisma.match.create({
            data: {
              id: matchId,
              mode,
              seed,
              status: MatchStatus.LOBBY,
            },
          });

          match = this.matchManager.createMatch(dbMatch.id, mode, seed);
        }
      } else if (mode === MatchMode.FRIENDS && roomCode) {
        // Join existing match by room code
        match = this.matchManager.getMatch(roomCode);

        if (!match) {
          this.sendError(ws, 'match_not_found', 'Match not found');
          ws.close();
          return;
        }
      } else {
        this.sendError(ws, 'invalid_mode', 'Invalid game mode');
        ws.close();
        return;
      }

      // Add player to match
      const joined = match.addPlayer(ws.playerId, user.id, user.displayName);

      if (!joined) {
        this.sendError(ws, 'match_full', 'Match is full');
        ws.close();
        return;
      }

      ws.matchId = match.id;

      // Create match player record
      await prisma.matchPlayer.create({
        data: {
          matchId: match.id,
          userId: user.id,
        },
      });

      // Send welcome message
      const welcome: ServerWelcome = {
        type: 'welcome',
        playerId: ws.playerId,
        matchId: match.id,
        seed: match.seed,
        tickRate: match.tickRate,
        startInMs: match.status === MatchStatus.LOBBY ? 3000 : 0,
        players: match.getPlayers(),
      };

      ws.send(JSON.stringify(welcome));

      // Start match if enough players (for quick race)
      if (mode === MatchMode.QUICK_RACE && match.status === MatchStatus.LOBBY && match.getPlayerCount() >= 2) {
        setTimeout(() => {
          if (match.status === MatchStatus.LOBBY) {
            match.start();
            this.startBroadcastLoop(match.id);
          }
        }, 3000);
      } else if (mode === MatchMode.FRIENDS && match.status === MatchStatus.ACTIVE) {
        // Already started, just sync
        this.startBroadcastLoop(match.id);
      }
    } catch (error) {
      logger.error({ error }, 'Auth error');
      this.sendError(ws, 'auth_failed', 'Authentication failed');
      ws.close();
    }
  }

  /**
   * Handle player input
   */
  private handleInput(ws: AuthenticatedWebSocket, input: any) {
    if (!ws.playerId || !ws.matchId) {
      return;
    }

    const match = this.matchManager.getMatch(ws.matchId);
    if (!match) {
      return;
    }

    match.queueInput(ws.playerId, input.seq, input.intent, Date.now());
  }

  /**
   * Handle player disconnect
   */
  private handleDisconnect(ws: AuthenticatedWebSocket) {
    if (ws.playerId && ws.matchId) {
      const match = this.matchManager.getMatch(ws.matchId);
      if (match) {
        match.removePlayer(ws.playerId);

        // Update database
        prisma.matchPlayer
          .updateMany({
            where: {
              matchId: ws.matchId,
              userId: ws.userId,
            },
            data: {
              leftAt: new Date(),
            },
          })
          .catch((err) => logger.error({ err }, 'Failed to update match player'));
      }

      logger.info({ playerId: ws.playerId, matchId: ws.matchId }, 'Player disconnected');
    }
  }

  /**
   * Start broadcasting snapshots for a match
   */
  private startBroadcastLoop(matchId: string) {
    const match = this.matchManager.getMatch(matchId);
    if (!match) return;

    const broadcastInterval = setInterval(() => {
      const currentMatch = this.matchManager.getMatch(matchId);

      if (!currentMatch || currentMatch.status === MatchStatus.COMPLETE) {
        clearInterval(broadcastInterval);
        return;
      }

      // Get game state
      const state = currentMatch.getState();

      // Broadcast to all connected players
      this.wss.clients.forEach((client) => {
        const ws = client as AuthenticatedWebSocket;

        if (ws.matchId === matchId && ws.readyState === WebSocket.OPEN && ws.playerId) {
          const player = currentMatch.getPlayer(ws.playerId);

          if (player) {
            const snapshot: ServerSnapshot = {
              type: 'snapshot',
              tick: state.tick,
              serverTime: state.serverTime,
              players: state.players.map((p) => ({
                ...p,
                isYou: p.id === ws.playerId,
              })),
              you: {
                ackSeq: player.lastAckedSeq,
              },
            };

            ws.send(JSON.stringify(snapshot));
          }
        }
      });
    }, 1000 / match.tickRate);
  }

  /**
   * Send error to client
   */
  private sendError(ws: WebSocket, code: string, message: string) {
    const error: ServerError = {
      type: 'error',
      code,
      message,
    };

    ws.send(JSON.stringify(error));
  }

  /**
   * Get match manager (for testing/debugging)
   */
  getMatchManager(): MatchManager {
    return this.matchManager;
  }
}
