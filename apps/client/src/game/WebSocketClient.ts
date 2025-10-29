import type {
  ClientMessage,
  ServerMessage,
  ServerWelcome,
  ServerSnapshot,
} from '@skipay/shared';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WebSocketClientCallbacks {
  onWelcome?: (msg: ServerWelcome) => void;
  onSnapshot?: (msg: ServerSnapshot) => void;
  onError?: (msg: { code: string; message: string }) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: WebSocketClientCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  public status: ConnectionStatus = 'disconnected';

  constructor(url: string, callbacks: WebSocketClientCallbacks) {
    this.url = url;
    this.callbacks = callbacks;
  }

  connect(token: string, mode: string, roomCode?: string) {
    if (this.ws) {
      this.ws.close();
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.setStatus('connected');
        this.reconnectAttempts = 0;

        // Send auth message - omit roomCode if undefined
        const authMessage: any = {
          type: 'auth',
          token,
          mode,
        };
        if (roomCode !== undefined) {
          authMessage.roomCode = roomCode;
        }
        console.log('Sending auth message:', authMessage);
        this.send(authMessage as ClientMessage);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.setStatus('error');
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.setStatus('disconnected');
        this.attemptReconnect(token, mode, roomCode);
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      this.setStatus('error');
    }
  }

  private handleMessage(message: ServerMessage) {
    switch (message.type) {
      case 'welcome':
        this.callbacks.onWelcome?.(message);
        break;
      case 'snapshot':
        this.callbacks.onSnapshot?.(message);
        break;
      case 'error':
        this.callbacks.onError?.(message);
        break;
      case 'pong':
        // Handle heartbeat
        break;
    }
  }

  send(message: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendInput(seq: number, tick: number, dtMs: number, intent: any) {
    this.send({
      type: 'input',
      seq,
      tick,
      dtMs,
      intent,
    } as ClientMessage);
  }

  ping() {
    this.send({
      type: 'ping',
      clientTime: Date.now(),
    } as ClientMessage);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private attemptReconnect(token: string, mode: string, roomCode?: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(token, mode, roomCode);
    }, delay);
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.callbacks.onConnectionChange?.(status);
  }
}
