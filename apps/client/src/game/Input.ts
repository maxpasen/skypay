export interface InputState {
  steer: number; // -1 to 1
  brake: boolean;
  tuck: boolean;
  jump: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;
  private touchTuck = false;
  private touchBrake = false;

  constructor() {
    this.setupKeyboard();
    this.setupTouch();
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
  }

  private setupTouch() {
    // Touch controls are handled by UI buttons
    // This is just a placeholder for the touch API
  }

  setTouch(button: 'left' | 'right' | 'jump' | 'tuck' | 'brake', pressed: boolean) {
    switch (button) {
      case 'left':
        this.touchLeft = pressed;
        break;
      case 'right':
        this.touchRight = pressed;
        break;
      case 'jump':
        this.touchJump = pressed;
        break;
      case 'tuck':
        this.touchTuck = pressed;
        break;
      case 'brake':
        this.touchBrake = pressed;
        break;
    }
  }

  getState(): InputState {
    let steer = 0;

    // Keyboard
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) {
      steer = -1;
    } else if (this.keys.has('ArrowRight') || this.keys.has('d')) {
      steer = 1;
    }

    // Touch
    if (this.touchLeft) steer = -1;
    if (this.touchRight) steer = 1;

    const brake = this.keys.has('ArrowDown') || this.keys.has('s') || this.touchBrake;
    const tuck = this.keys.has('ArrowUp') || this.keys.has('w') || this.touchTuck;
    const jump = this.keys.has(' ') || this.touchJump;

    return { steer, brake, tuck, jump };
  }

  reset() {
    this.keys.clear();
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJump = false;
    this.touchTuck = false;
    this.touchBrake = false;
  }
}
