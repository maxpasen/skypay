// Game constants
export const GAME_CONSTANTS = {
  // Physics
  MAX_SPEED: 500, // units per second
  MIN_SPEED: 50,
  ACCELERATION: 100,
  DECELERATION: 150,
  BRAKE_DECELERATION: 300,
  TUCK_ACCELERATION_BONUS: 50,
  FRICTION: 0.98,
  TURN_RATE: 200, // degrees per second at base speed
  JUMP_VELOCITY: 150,
  GRAVITY: 400,
  AIRBORNE_DURATION_MIN: 0.3, // seconds
  AIRBORNE_DURATION_MAX: 1.5,

  // World
  CHUNK_SIZE: 1024,
  VIEW_DISTANCE: 2048,
  SLOPE_ANGLE: 15, // degrees

  // Collision
  PLAYER_RADIUS: 16,
  OBSTACLE_CHECK_RADIUS: 100,

  // Multiplayer
  SERVER_TICK_RATE: 20, // Hz
  CLIENT_UPDATE_RATE: 60, // Hz
  MAX_PLAYERS_PER_MATCH: 8,
  INPUT_BUFFER_SIZE: 60,
  RECONCILIATION_WINDOW: 0.15, // seconds

  // Scoring
  DISTANCE_SCORE_MULTIPLIER: 1,
  TRICK_SCORE_BASE: 100,
  OBSTACLE_HIT_PENALTY: -50,
  PICKUP_SCORE: 50,

  // Yeti
  YETI_SPAWN_DISTANCE: 2000,
  YETI_SPEED: 300,
  YETI_CATCH_DISTANCE: 30,
} as const;

// Map generation
export const MAP_CONFIG = {
  TREE_DENSITY: 0.015,
  ROCK_DENSITY: 0.008,
  JUMP_DENSITY: 0.003,
  PICKUP_DENSITY: 0.005,
  ICE_PATCH_DENSITY: 0.01,
  MIN_OBSTACLE_SPACING: 80,
  PATH_WIDTH: 200, // guaranteed clear path width
} as const;

// Obstacle types
export enum ObstacleType {
  TREE = 'tree',
  ROCK = 'rock',
  STUMP = 'stump',
  SNOWMAN = 'snowman',
  JUMP = 'jump',
  ICE_PATCH = 'ice',
}

// Pickup types
export enum PickupType {
  SPEED_BOOST = 'speed_boost',
  INVULNERABILITY = 'invulnerable',
  SCORE_MULTIPLIER = 'score_multiplier',
}

// Player states
export enum PlayerState {
  SKIING = 'skiing',
  JUMPING = 'jumping',
  CRASHED = 'crashed',
  FINISHED = 'finished',
}

// Match modes
export enum MatchMode {
  SOLO = 'solo',
  QUICK_RACE = 'race',
  FRIENDS = 'friends',
}

// Match status
export enum MatchStatus {
  LOBBY = 'lobby',
  ACTIVE = 'active',
  COMPLETE = 'complete',
}
