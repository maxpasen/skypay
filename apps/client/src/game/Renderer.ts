import { PlayerState, ObstacleType, PickupType } from '@skipay/shared';
import type { PlayerSnapshot, GameObject } from '@skipay/shared';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private camera = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');

    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  clear() {
    // Sky gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#ffffff');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  updateCamera(player: PlayerSnapshot) {
    // Camera follows player with some offset
    this.camera.x = player.x;
    this.camera.y = player.y - 200; // Keep player slightly below center
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.camera.x) + this.width / 2,
      y: (y - this.camera.y) + this.height / 2,
    };
  }

  drawPlayer(player: PlayerSnapshot, isYou: boolean) {
    const screen = this.worldToScreen(player.x, player.y);

    this.ctx.save();
    this.ctx.translate(screen.x, screen.y);

    // Different appearance based on state
    if (player.state === PlayerState.CRASHED) {
      this.ctx.fillStyle = '#ff0000';
      this.ctx.fillRect(-12, -12, 24, 24);
    } else if (player.state === PlayerState.JUMPING) {
      this.ctx.fillStyle = isYou ? '#3b82f6' : '#8b5cf6';
      this.ctx.beginPath();
      this.ctx.moveTo(0, -20);
      this.ctx.lineTo(-10, 10);
      this.ctx.lineTo(10, 10);
      this.ctx.closePath();
      this.ctx.fill();
    } else {
      // Skiing
      this.ctx.fillStyle = isYou ? '#3b82f6' : '#8b5cf6';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 16, 0, Math.PI * 2);
      this.ctx.fill();

      // Skis
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(-10, 10);
      this.ctx.lineTo(-12, 20);
      this.ctx.moveTo(10, 10);
      this.ctx.lineTo(12, 20);
      this.ctx.stroke();
    }

    // Name tag
    if (!isYou) {
      this.ctx.fillStyle = '#000000';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Player', 0, -30);
    }

    this.ctx.restore();
  }

  drawObject(obj: GameObject) {
    const screen = this.worldToScreen(obj.x, obj.y);

    // Only draw if on screen
    if (screen.y < -100 || screen.y > this.height + 100) return;
    if (screen.x < -100 || screen.x > this.width + 100) return;

    this.ctx.save();
    this.ctx.translate(screen.x, screen.y);

    switch (obj.type) {
      case ObstacleType.TREE:
        // Tree
        this.ctx.fillStyle = '#0f5132';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -30);
        this.ctx.lineTo(-15, 10);
        this.ctx.lineTo(15, 10);
        this.ctx.closePath();
        this.ctx.fill();

        // Trunk
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(-5, 10, 10, 15);
        break;

      case ObstacleType.ROCK:
        this.ctx.fillStyle = '#808080';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case ObstacleType.STUMP:
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(-10, -8, 20, 16);
        break;

      case ObstacleType.SNOWMAN:
        // Bottom ball
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 5, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // Top ball
        this.ctx.beginPath();
        this.ctx.arc(0, -10, 8, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case ObstacleType.JUMP:
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(-20, 10);
        this.ctx.lineTo(0, -10);
        this.ctx.lineTo(20, 10);
        this.ctx.closePath();
        this.ctx.fill();
        break;

      case PickupType.SPEED_BOOST:
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#ff8c00';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        break;

      case PickupType.INVULNERABILITY:
        this.ctx.fillStyle = '#00ffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case PickupType.SCORE_MULTIPLIER:
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }

    this.ctx.restore();
  }

  drawSnowTrail() {
    // Simple snow particles
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}
