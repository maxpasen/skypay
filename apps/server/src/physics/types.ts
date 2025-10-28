import { PlayerState, ObstacleType, PickupType } from '@skipay/shared';

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerIntent {
  steer: number; // -1 to 1
  brake: number; // 0 or 1
  tuck: number; // 0 or 1
  jump: number; // 0 or 1
}

export interface PlayerPhysics {
  id: string;
  position: Vec2;
  velocity: Vec2;
  state: PlayerState;
  distance: number;
  score: number;
  speed: number;
  airborneTime: number;
  effectExpiry: Map<string, number>; // effect name -> expiry timestamp
  lastJumpY: number;
}

export interface WorldObject {
  id: string;
  type: ObstacleType | PickupType;
  position: Vec2;
  radius: number;
  active: boolean;
}

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CollisionResult {
  collided: boolean;
  object?: WorldObject;
}
