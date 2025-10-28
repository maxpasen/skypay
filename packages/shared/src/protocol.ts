import { z } from 'zod';
import { MatchMode, MatchStatus, ObstacleType, PickupType, PlayerState } from './constants.js';

// ============================================================================
// Client -> Server Messages
// ============================================================================

export const ClientInputSchema = z.object({
  type: z.literal('input'),
  seq: z.number().int().min(0), // sequence number
  tick: z.number().int().min(0), // client predicted tick
  dtMs: z.number().min(0).max(100), // delta time in ms since last input
  intent: z.object({
    steer: z.number().min(-1).max(1), // -1 = left, 1 = right
    brake: z.number().int().min(0).max(1), // 0 or 1
    tuck: z.number().int().min(0).max(1), // 0 or 1
    jump: z.number().int().min(0).max(1), // 0 or 1
  }),
});

export const ClientAuthSchema = z.object({
  type: z.literal('auth'),
  token: z.string(),
  mode: z.nativeEnum(MatchMode),
  roomCode: z.string().optional(),
});

export const ClientHeartbeatSchema = z.object({
  type: z.literal('ping'),
  clientTime: z.number(),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  ClientInputSchema,
  ClientAuthSchema,
  ClientHeartbeatSchema,
]);

export type ClientInput = z.infer<typeof ClientInputSchema>;
export type ClientAuth = z.infer<typeof ClientAuthSchema>;
export type ClientHeartbeat = z.infer<typeof ClientHeartbeatSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ============================================================================
// Server -> Client Messages
// ============================================================================

export const ServerWelcomeSchema = z.object({
  type: z.literal('welcome'),
  playerId: z.string(),
  matchId: z.string(),
  seed: z.number(),
  tickRate: z.number(),
  startInMs: z.number(),
  players: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
    })
  ),
});

export const PlayerSnapshotSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  vx: z.number(),
  vy: z.number(),
  state: z.nativeEnum(PlayerState),
  distance: z.number(),
  score: z.number(),
  isYou: z.boolean().optional(),
});

export const GameObjectSchema = z.object({
  id: z.string(),
  type: z.union([z.nativeEnum(ObstacleType), z.nativeEnum(PickupType)]),
  x: z.number(),
  y: z.number(),
  removed: z.boolean().optional(), // true if picked up or destroyed
});

export const GameEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('collision'),
    playerId: z.string(),
    objectId: z.string(),
  }),
  z.object({
    type: z.literal('pickup'),
    playerId: z.string(),
    pickupType: z.nativeEnum(PickupType),
  }),
  z.object({
    type: z.literal('trick'),
    playerId: z.string(),
    score: z.number(),
  }),
  z.object({
    type: z.literal('yeti_spawn'),
    yetiId: z.string(),
  }),
  z.object({
    type: z.literal('player_finished'),
    playerId: z.string(),
    placement: z.number(),
  }),
]);

export const ServerSnapshotSchema = z.object({
  type: z.literal('snapshot'),
  tick: z.number().int(),
  serverTime: z.number(),
  players: z.array(PlayerSnapshotSchema),
  objectsDelta: z.array(GameObjectSchema).optional(), // only changed objects
  you: z.object({
    ackSeq: z.number(), // last acknowledged input sequence
  }),
  events: z.array(GameEventSchema).optional(),
});

export const ServerHeartbeatSchema = z.object({
  type: z.literal('pong'),
  clientTime: z.number(),
  serverTime: z.number(),
});

export const ServerErrorSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

export const ServerMatchEndSchema = z.object({
  type: z.literal('match_end'),
  finalResults: z.array(
    z.object({
      playerId: z.string(),
      displayName: z.string(),
      placement: z.number(),
      score: z.number(),
      distance: z.number(),
    })
  ),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  ServerWelcomeSchema,
  ServerSnapshotSchema,
  ServerHeartbeatSchema,
  ServerErrorSchema,
  ServerMatchEndSchema,
]);

export type ServerWelcome = z.infer<typeof ServerWelcomeSchema>;
export type PlayerSnapshot = z.infer<typeof PlayerSnapshotSchema>;
export type GameObject = z.infer<typeof GameObjectSchema>;
export type GameEvent = z.infer<typeof GameEventSchema>;
export type ServerSnapshot = z.infer<typeof ServerSnapshotSchema>;
export type ServerHeartbeat = z.infer<typeof ServerHeartbeatSchema>;
export type ServerError = z.infer<typeof ServerErrorSchema>;
export type ServerMatchEnd = z.infer<typeof ServerMatchEndSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

// ============================================================================
// REST API Schemas
// ============================================================================

export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
});

export const SubmitRunSchema = z.object({
  mode: z.nativeEnum(MatchMode),
  distance: z.number().min(0),
  score: z.number().int().min(0),
  maxSpeed: z.number().min(0),
  obstaclesHit: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  seed: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export const LeaderboardRangeSchema = z.enum(['daily', 'weekly', 'all']);

export const EquipCosmeticSchema = z.object({
  cosmeticId: z.string(),
});

export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;
export type SubmitRun = z.infer<typeof SubmitRunSchema>;
export type LeaderboardRange = z.infer<typeof LeaderboardRangeSchema>;
export type EquipCosmetic = z.infer<typeof EquipCosmeticSchema>;

// ============================================================================
// Response Types
// ============================================================================

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  cosmetics: {
    id: string;
    key: string;
    name: string;
    type: string;
    equipped: boolean;
  }[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  distance: number;
  createdAt: string;
}

export interface LeaderboardResponse {
  range: LeaderboardRange;
  entries: LeaderboardEntry[];
  yourEntry?: LeaderboardEntry;
}

export interface HealthResponse {
  ok: boolean;
  commitSha?: string;
  uptime: number;
  db: 'ok' | 'error';
}
