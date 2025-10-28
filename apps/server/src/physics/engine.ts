import { GAME_CONSTANTS, PlayerState } from '@skipay/shared';
import type { PlayerIntent, PlayerPhysics, WorldObject, CollisionResult } from './types.js';

export class PhysicsEngine {
  /**
   * Update player physics for one tick
   */
  updatePlayer(
    player: PlayerPhysics,
    intent: PlayerIntent,
    dt: number,
    objects: WorldObject[],
    serverTime: number
  ): { events: any[] } {
    const events: any[] = [];

    // Skip if crashed
    if (player.state === PlayerState.CRASHED) {
      return { events };
    }

    // Handle jumping
    if (player.state === PlayerState.SKIING && intent.jump === 1) {
      player.state = PlayerState.JUMPING;
      player.velocity.y += GAME_CONSTANTS.JUMP_VELOCITY;
      player.airborneTime = 0;
      player.lastJumpY = player.position.y;
    }

    // Update airborne state
    if (player.state === PlayerState.JUMPING) {
      player.airborneTime += dt;

      // Apply gravity
      player.velocity.y -= GAME_CONSTANTS.GRAVITY * dt;

      // Land when coming back down
      if (player.velocity.y <= 0 && player.airborneTime >= GAME_CONSTANTS.AIRBORNE_DURATION_MIN) {
        player.state = PlayerState.SKIING;

        // Trick bonus if good timing
        const airTime = player.airborneTime;
        if (airTime >= GAME_CONSTANTS.AIRBORNE_DURATION_MIN &&
            airTime <= GAME_CONSTANTS.AIRBORNE_DURATION_MAX) {
          const trickScore = Math.floor(GAME_CONSTANTS.TRICK_SCORE_BASE * (airTime / GAME_CONSTANTS.AIRBORNE_DURATION_MAX));
          player.score += trickScore;
          events.push({
            type: 'trick',
            playerId: player.id,
            score: trickScore,
          });
        }
      }
    }

    // Calculate acceleration
    let accel: number = GAME_CONSTANTS.ACCELERATION;
    if (intent.tuck === 1) {
      accel += GAME_CONSTANTS.TUCK_ACCELERATION_BONUS;
    }

    // Apply deceleration
    if (intent.brake === 1) {
      accel = -GAME_CONSTANTS.BRAKE_DECELERATION;
    }

    // Check for invulnerability
    const isInvulnerable = player.effectExpiry.has('invulnerable') &&
                          player.effectExpiry.get('invulnerable')! > serverTime;

    // Update velocity
    const forwardSpeed = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
    const newSpeed = Math.max(
      GAME_CONSTANTS.MIN_SPEED,
      Math.min(GAME_CONSTANTS.MAX_SPEED, forwardSpeed + accel * dt)
    );

    // Apply steering (only when on ground)
    if (player.state === PlayerState.SKIING) {
      const turnRate = GAME_CONSTANTS.TURN_RATE * dt * intent.steer;
      const angle = Math.atan2(player.velocity.y, player.velocity.x);
      const newAngle = angle + (turnRate * Math.PI) / 180;

      player.velocity.x = Math.cos(newAngle) * newSpeed;
      player.velocity.y = Math.sin(newAngle) * newSpeed;
    } else {
      // In air, maintain speed but adjust direction slightly
      const angle = Math.atan2(player.velocity.y, player.velocity.x);
      player.velocity.x = Math.cos(angle) * newSpeed;
      player.velocity.y = Math.sin(angle) * newSpeed;
    }

    // Apply friction
    player.velocity.x *= GAME_CONSTANTS.FRICTION;
    player.velocity.y *= GAME_CONSTANTS.FRICTION;

    // Update position
    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;

    // Update distance (only forward progress)
    const distanceGain = Math.max(0, player.velocity.y * dt);
    player.distance += distanceGain;
    player.score += Math.floor(distanceGain * GAME_CONSTANTS.DISTANCE_SCORE_MULTIPLIER);

    // Store current speed
    player.speed = newSpeed;

    // Check collisions (only when on ground and not invulnerable)
    if (player.state === PlayerState.SKIING && !isInvulnerable) {
      const collision = this.checkCollisions(player, objects);

      if (collision.collided && collision.object) {
        const obj = collision.object;

        // Handle pickups
        if (this.isPickup(obj.type)) {
          obj.active = false;
          player.score += GAME_CONSTANTS.PICKUP_SCORE;

          // Apply effect
          const effectDuration = 5000; // 5 seconds
          player.effectExpiry.set(obj.type, serverTime + effectDuration);

          events.push({
            type: 'pickup',
            playerId: player.id,
            pickupType: obj.type,
          });
        } else {
          // Hit obstacle
          player.state = PlayerState.CRASHED;
          player.velocity.x = 0;
          player.velocity.y = 0;
          player.score += GAME_CONSTANTS.OBSTACLE_HIT_PENALTY;

          events.push({
            type: 'collision',
            playerId: player.id,
            objectId: obj.id,
          });
        }
      }
    }

    return { events };
  }

  /**
   * Check collision between player and objects
   */
  private checkCollisions(player: PlayerPhysics, objects: WorldObject[]): CollisionResult {
    for (const obj of objects) {
      if (!obj.active) continue;

      const dx = player.position.x - obj.position.x;
      const dy = player.position.y - obj.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < GAME_CONSTANTS.PLAYER_RADIUS + obj.radius) {
        return { collided: true, object: obj };
      }
    }

    return { collided: false };
  }

  /**
   * Check if object type is a pickup
   */
  private isPickup(type: string): boolean {
    return ['speed_boost', 'invulnerable', 'score_multiplier'].includes(type);
  }

  /**
   * Validate player state changes (anti-cheat)
   */
  validatePlayerState(
    oldState: PlayerPhysics,
    newState: PlayerPhysics,
    dt: number
  ): { valid: boolean; reason?: string } {
    // Check max speed
    const speed = Math.sqrt(newState.velocity.x ** 2 + newState.velocity.y ** 2);
    if (speed > GAME_CONSTANTS.MAX_SPEED * 1.1) {
      return { valid: false, reason: 'speed_too_high' };
    }

    // Check max acceleration
    const oldSpeed = Math.sqrt(oldState.velocity.x ** 2 + oldState.velocity.y ** 2);
    const accelMax = GAME_CONSTANTS.ACCELERATION + GAME_CONSTANTS.TUCK_ACCELERATION_BONUS;
    const maxSpeedChange = accelMax * dt * 2; // Allow some margin
    if (Math.abs(speed - oldSpeed) > maxSpeedChange) {
      return { valid: false, reason: 'acceleration_too_high' };
    }

    // Check teleportation
    const dx = newState.position.x - oldState.position.x;
    const dy = newState.position.y - oldState.position.y;
    const maxDist = GAME_CONSTANTS.MAX_SPEED * dt * 2;
    if (Math.sqrt(dx * dx + dy * dy) > maxDist) {
      return { valid: false, reason: 'teleportation' };
    }

    return { valid: true };
  }
}
