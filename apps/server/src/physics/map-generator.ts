import { ObstacleType, PickupType, MAP_CONFIG, GAME_CONSTANTS } from '@skipay/shared';
import { PRNG } from '../lib/prng.js';
import type { WorldObject } from './types.js';

export class MapGenerator {
  private prng: PRNG;
  private generatedChunks: Set<string>;
  private objects: Map<string, WorldObject>;

  constructor(seed: number) {
    this.prng = new PRNG(seed);
    this.generatedChunks = new Set();
    this.objects = new Map();
  }

  /**
   * Generate objects for a chunk if not already generated
   */
  generateChunk(chunkX: number, chunkY: number): WorldObject[] {
    const chunkKey = `${chunkX},${chunkY}`;

    if (this.generatedChunks.has(chunkKey)) {
      return this.getObjectsInChunk(chunkX, chunkY);
    }

    this.generatedChunks.add(chunkKey);

    const chunkObjects: WorldObject[] = [];
    const chunkSize = GAME_CONSTANTS.CHUNK_SIZE;
    const baseX = chunkX * chunkSize;
    const baseY = chunkY * chunkSize;

    // Create a seeded PRNG for this specific chunk (deterministic per chunk)
    const chunkSeed = this.hashChunk(chunkX, chunkY);
    const chunkRng = new PRNG(chunkSeed);

    // Generate trees
    const numTrees = Math.floor(chunkSize * chunkSize * MAP_CONFIG.TREE_DENSITY);
    for (let i = 0; i < numTrees; i++) {
      chunkObjects.push(this.createObject(
        ObstacleType.TREE,
        baseX + chunkRng.nextFloat(0, chunkSize),
        baseY + chunkRng.nextFloat(0, chunkSize),
        20
      ));
    }

    // Generate rocks
    const numRocks = Math.floor(chunkSize * chunkSize * MAP_CONFIG.ROCK_DENSITY);
    for (let i = 0; i < numRocks; i++) {
      chunkObjects.push(this.createObject(
        ObstacleType.ROCK,
        baseX + chunkRng.nextFloat(0, chunkSize),
        baseY + chunkRng.nextFloat(0, chunkSize),
        15
      ));
    }

    // Generate stumps
    const numStumps = Math.floor(chunkSize * chunkSize * MAP_CONFIG.ROCK_DENSITY * 0.5);
    for (let i = 0; i < numStumps; i++) {
      chunkObjects.push(this.createObject(
        ObstacleType.STUMP,
        baseX + chunkRng.nextFloat(0, chunkSize),
        baseY + chunkRng.nextFloat(0, chunkSize),
        12
      ));
    }

    // Generate jumps
    const numJumps = Math.floor(chunkSize * chunkSize * MAP_CONFIG.JUMP_DENSITY);
    for (let i = 0; i < numJumps; i++) {
      chunkObjects.push(this.createObject(
        ObstacleType.JUMP,
        baseX + chunkRng.nextFloat(0, chunkSize),
        baseY + chunkRng.nextFloat(0, chunkSize),
        25
      ));
    }

    // Generate pickups
    const numPickups = Math.floor(chunkSize * chunkSize * MAP_CONFIG.PICKUP_DENSITY);
    for (let i = 0; i < numPickups; i++) {
      const pickupTypes = [PickupType.SPEED_BOOST, PickupType.INVULNERABILITY, PickupType.SCORE_MULTIPLIER];
      const pickupType = pickupTypes[chunkRng.nextInt(0, pickupTypes.length - 1)];

      chunkObjects.push(this.createObject(
        pickupType,
        baseX + chunkRng.nextFloat(0, chunkSize),
        baseY + chunkRng.nextFloat(0, chunkSize),
        10
      ));
    }

    // Ensure there's a clear path (remove obstacles too close to center)
    const centerX = baseX + chunkSize / 2;
    const pathWidth = MAP_CONFIG.PATH_WIDTH;

    const filtered = chunkObjects.filter((obj) => {
      const distFromCenter = Math.abs(obj.position.x - centerX);
      return distFromCenter > pathWidth / 2;
    });

    // Store objects
    filtered.forEach((obj) => {
      this.objects.set(obj.id, obj);
    });

    return filtered;
  }

  /**
   * Get objects in a specific chunk
   */
  private getObjectsInChunk(chunkX: number, chunkY: number): WorldObject[] {
    const chunkSize = GAME_CONSTANTS.CHUNK_SIZE;
    const baseX = chunkX * chunkSize;
    const baseY = chunkY * chunkSize;

    return Array.from(this.objects.values()).filter((obj) => {
      return (
        obj.position.x >= baseX &&
        obj.position.x < baseX + chunkSize &&
        obj.position.y >= baseY &&
        obj.position.y < baseY + chunkSize
      );
    });
  }

  /**
   * Get all objects within a radius of a point
   */
  getObjectsNear(x: number, y: number, radius: number): WorldObject[] {
    // Determine which chunks to check
    const chunkSize = GAME_CONSTANTS.CHUNK_SIZE;
    const minChunkX = Math.floor((x - radius) / chunkSize);
    const maxChunkX = Math.floor((x + radius) / chunkSize);
    const minChunkY = Math.floor((y - radius) / chunkSize);
    const maxChunkY = Math.floor((y + radius) / chunkSize);

    // Generate chunks if needed and collect objects
    const nearObjects: WorldObject[] = [];

    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      for (let cy = minChunkY; cy <= maxChunkY; cy++) {
        this.generateChunk(cx, cy);
      }
    }

    // Filter objects within radius
    for (const obj of this.objects.values()) {
      const dx = obj.position.x - x;
      const dy = obj.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius && obj.active) {
        nearObjects.push(obj);
      }
    }

    return nearObjects;
  }

  /**
   * Get object by ID
   */
  getObject(id: string): WorldObject | undefined {
    return this.objects.get(id);
  }

  /**
   * Create a world object
   */
  private createObject(
    type: ObstacleType | PickupType,
    x: number,
    y: number,
    radius: number
  ): WorldObject {
    const id = `${type}-${Math.floor(x)}-${Math.floor(y)}`;

    return {
      id,
      type,
      position: { x, y },
      radius,
      active: true,
    };
  }

  /**
   * Hash chunk coordinates to a deterministic seed
   */
  private hashChunk(x: number, y: number): number {
    // Simple hash combining chunk coordinates
    let hash = 0;
    const str = `${x},${y}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
