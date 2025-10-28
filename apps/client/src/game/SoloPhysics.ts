// Simple solo game physics (client-side only)
export interface SoloPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  distance: number;
  score: number;
  state: 'skiing' | 'jumping' | 'crashed';
  airborneTime: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  type: 'tree' | 'rock' | 'stump';
  radius: number;
}

export class SoloPhysics {
  private player: SoloPlayer;
  private obstacles: Obstacle[] = [];
  private nextObstacleId = 0;

  // Physics constants (simplified from server)
  private readonly ACCELERATION = 120;
  private readonly TUCK_BONUS = 60;
  private readonly BRAKE_DECEL = 200;
  private readonly MAX_SPEED = 500;
  private readonly MIN_SPEED = 50;
  private readonly TURN_SPEED = 300;
  private readonly GRAVITY = 400;
  private readonly JUMP_VELOCITY = 150;

  constructor() {
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: this.MIN_SPEED,
      distance: 0,
      score: 0,
      state: 'skiing',
      airborneTime: 0,
    };

    // Generate initial obstacles
    this.generateObstacles();
  }

  getPlayer(): SoloPlayer {
    return this.player;
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  update(dt: number, input: { steer: number; brake: boolean; tuck: boolean; jump: boolean }) {
    if (this.player.state === 'crashed') {
      return;
    }

    // Handle jumping
    if (this.player.state === 'skiing' && input.jump) {
      this.player.state = 'jumping';
      this.player.vy += this.JUMP_VELOCITY;
      this.player.airborneTime = 0;
    }

    // Update airborne state
    if (this.player.state === 'jumping') {
      this.player.airborneTime += dt;
      this.player.vy -= this.GRAVITY * dt;

      // Land when coming back down
      if (this.player.vy <= this.MIN_SPEED && this.player.airborneTime >= 0.2) {
        this.player.state = 'skiing';
        this.player.vy = this.MIN_SPEED;

        // Trick bonus
        if (this.player.airborneTime >= 0.5) {
          const bonus = Math.floor(100 * (this.player.airborneTime / 2));
          this.player.score += bonus;
        }
      }
    }

    // Calculate acceleration
    let accel = this.ACCELERATION;
    if (input.tuck) {
      accel += this.TUCK_BONUS;
    }
    if (input.brake) {
      accel = -this.BRAKE_DECEL;
    }

    // Update forward speed
    const currentSpeed = Math.abs(this.player.vy);
    const newSpeed = Math.max(this.MIN_SPEED, Math.min(this.MAX_SPEED, currentSpeed + accel * dt));
    this.player.vy = newSpeed;

    // Steering
    this.player.vx = input.steer * this.TURN_SPEED;

    // Update position
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
    this.player.distance = this.player.y;

    // Keep player centered
    if (this.player.x < -200) this.player.x = -200;
    if (this.player.x > 200) this.player.x = 200;

    // Generate more obstacles as player advances
    if (this.player.y > this.obstacles[this.obstacles.length - 1].y - 1000) {
      this.generateObstacles();
    }

    // Remove obstacles that are too far behind
    this.obstacles = this.obstacles.filter(obs => obs.y > this.player.y - 500);

    // Check collisions
    this.checkCollisions();

    // Score for distance
    this.player.score += Math.floor(newSpeed * dt * 0.1);
  }

  private checkCollisions() {
    if (this.player.state === 'jumping') return;

    const playerRadius = 10;

    for (const obs of this.obstacles) {
      const dx = this.player.x - obs.x;
      const dy = this.player.y - obs.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < playerRadius + obs.radius) {
        this.player.state = 'crashed';
        this.player.vx = 0;
        this.player.vy = 0;
        break;
      }
    }
  }

  private generateObstacles() {
    const startY = this.obstacles.length === 0 ? 100 : this.obstacles[this.obstacles.length - 1].y + 100;

    for (let i = 0; i < 20; i++) {
      const y = startY + i * 50;
      const count = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < count; j++) {
        const x = (Math.random() - 0.5) * 400; // -200 to 200
        const types: Array<'tree' | 'rock' | 'stump'> = ['tree', 'rock', 'stump'];
        const type = types[Math.floor(Math.random() * types.length)];
        const radius = type === 'tree' ? 15 : type === 'rock' ? 12 : 10;

        this.obstacles.push({
          id: `obs-${this.nextObstacleId++}`,
          x,
          y,
          type,
          radius,
        });
      }
    }
  }

  reset() {
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: this.MIN_SPEED,
      distance: 0,
      score: 0,
      state: 'skiing',
      airborneTime: 0,
    };
    this.obstacles = [];
    this.nextObstacleId = 0;
    this.generateObstacles();
  }
}
