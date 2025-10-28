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

    // Keep player in bounds (wider for easier gameplay)
    if (this.player.x < -350) this.player.x = -350;
    if (this.player.x > 350) this.player.x = 350;

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

    // Smaller collision radius for more forgiving gameplay
    const playerRadius = 25;

    for (const obs of this.obstacles) {
      const dx = this.player.x - obs.x;
      const dy = this.player.y - obs.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // More forgiving collision - need to really hit the obstacle
      if (distance < playerRadius + obs.radius - 10) {
        this.player.state = 'crashed';
        this.player.vx = 0;
        this.player.vy = 0;
        break;
      }
    }
  }

  private generateObstacles() {
    const startY = this.obstacles.length === 0 ? 200 : this.obstacles[this.obstacles.length - 1].y + 150;

    // Fewer obstacles, more spread out
    for (let i = 0; i < 15; i++) {
      const y = startY + i * 100; // More space between rows

      // Only 30% chance of obstacles per row
      if (Math.random() < 0.7) {
        const count = Math.floor(Math.random() * 2) + 1; // 1-2 obstacles per row

        for (let j = 0; j < count; j++) {
          // Wider spread, easier to dodge
          const x = (Math.random() - 0.5) * 600; // -300 to 300
          const types: Array<'tree' | 'rock' | 'stump'> = ['tree', 'rock', 'stump'];
          const type = types[Math.floor(Math.random() * types.length)];
          const radius = type === 'tree' ? 20 : type === 'rock' ? 18 : 15;

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
