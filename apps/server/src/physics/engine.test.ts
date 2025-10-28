import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsEngine } from './engine.js';
import { PlayerState } from '@skipay/shared';
import type { PlayerPhysics, PlayerIntent } from './types.js';

describe('PhysicsEngine', () => {
  let engine: PhysicsEngine;
  let player: PlayerPhysics;

  beforeEach(() => {
    engine = new PhysicsEngine();
    player = {
      id: 'test-player',
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 50 },
      state: PlayerState.SKIING,
      distance: 0,
      score: 0,
      speed: 50,
      airborneTime: 0,
      effectExpiry: new Map(),
      lastJumpY: 0,
    };
  });

  describe('updatePlayer', () => {
    it('should update player position based on velocity', () => {
      const intent: PlayerIntent = { steer: 0, brake: 0, tuck: 0, jump: 0 };
      const dt = 0.1; // 100ms

      engine.updatePlayer(player, intent, dt, [], Date.now());

      expect(player.position.y).toBeGreaterThan(0);
      expect(player.distance).toBeGreaterThan(0);
    });

    it('should increase speed when tucking', () => {
      const initialSpeed = player.speed;
      const intent: PlayerIntent = { steer: 0, brake: 0, tuck: 1, jump: 0 };

      engine.updatePlayer(player, intent, 0.1, [], Date.now());

      expect(player.speed).toBeGreaterThan(initialSpeed);
    });

    it('should decrease speed when braking', () => {
      player.velocity.y = 100;
      player.speed = 100;

      const intent: PlayerIntent = { steer: 0, brake: 1, tuck: 0, jump: 0 };

      engine.updatePlayer(player, intent, 0.1, [], Date.now());

      expect(player.speed).toBeLessThan(100);
    });

    it('should change to jumping state when jump pressed', () => {
      const intent: PlayerIntent = { steer: 0, brake: 0, tuck: 0, jump: 1 };

      engine.updatePlayer(player, intent, 0.1, [], Date.now());

      expect(player.state).toBe(PlayerState.JUMPING);
    });

    it('should not jump if already jumping', () => {
      player.state = PlayerState.JUMPING;

      const intent: PlayerIntent = { steer: 0, brake: 0, tuck: 0, jump: 1 };

      engine.updatePlayer(player, intent, 0.1, [], Date.now());

      // Velocity should have changed due to gravity, but not jumped again
      expect(player.state).toBe(PlayerState.JUMPING);
    });

    it('should increase score based on distance', () => {
      const intent: PlayerIntent = { steer: 0, brake: 0, tuck: 0, jump: 0 };

      engine.updatePlayer(player, intent, 1.0, [], Date.now());

      expect(player.score).toBeGreaterThan(0);
      expect(player.distance).toBeGreaterThan(0);
    });
  });

  describe('validatePlayerState', () => {
    it('should reject speeds above maximum', () => {
      const oldState = { ...player };
      const newState = { ...player };
      newState.velocity.y = 1000; // Way too fast

      const result = engine.validatePlayerState(oldState, newState, 0.1);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('speed_too_high');
    });

    it('should reject impossible acceleration', () => {
      const oldState = { ...player };
      oldState.velocity.y = 50;

      const newState = { ...player };
      newState.velocity.y = 500; // Instant speed up

      const result = engine.validatePlayerState(oldState, newState, 0.01);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('acceleration_too_high');
    });

    it('should reject teleportation', () => {
      const oldState = { ...player };
      oldState.position.y = 0;

      const newState = { ...player };
      newState.position.y = 10000; // Teleported

      const result = engine.validatePlayerState(oldState, newState, 0.01);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('teleportation');
    });

    it('should accept valid state changes', () => {
      const oldState = { ...player };
      oldState.velocity.y = 50;
      oldState.position.y = 0;

      const newState = { ...player };
      newState.velocity.y = 60; // Reasonable acceleration
      newState.position.y = 5; // Reasonable movement

      const result = engine.validatePlayerState(oldState, newState, 0.1);

      expect(result.valid).toBe(true);
    });
  });
});
