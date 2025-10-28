# WebSocket Protocol Specification

This document describes the WebSocket protocol between client and server.

## Connection

**URL**: `wss://your-server.com/ws` (or `ws://localhost:3000/ws` in dev)

**Flow**:
1. Client establishes WebSocket connection
2. Client sends `auth` message with JWT token
3. Server responds with `welcome` message
4. Game begins, client sends `input` messages
5. Server broadcasts `snapshot` messages to all players

## Message Format

All messages are JSON, validated with Zod schemas (see `packages/shared/src/protocol.ts`).

---

## Client → Server Messages

### 1. Authentication

Sent immediately after connection to authenticate and join a match.

```typescript
{
  type: 'auth',
  token: string,           // JWT token from cookie
  mode: 'solo' | 'race' | 'friends',
  roomCode?: string        // Required for 'friends' mode
}
```

**Response**: Server sends `welcome` message (see below).

**Errors**:
- `auth_failed` - Invalid token
- `match_full` - Room is full
- `match_not_found` - Invalid room code

---

### 2. Input

Sent 60 times per second (or less) to report player input.

```typescript
{
  type: 'input',
  seq: number,             // Monotonically increasing sequence number
  tick: number,            // Client's predicted tick number
  dtMs: number,            // Delta time in milliseconds since last input
  intent: {
    steer: number,         // -1.0 (left) to 1.0 (right)
    brake: 0 | 1,          // 0 = not braking, 1 = braking
    tuck: 0 | 1,           // 0 = normal, 1 = tucking (speed boost)
    jump: 0 | 1            // 0 = on ground, 1 = jumping
  }
}
```

**Notes**:
- `seq` must increase with each message (used for reconciliation)
- `dtMs` should be capped at 100ms to prevent time manipulation
- Server may drop inputs if sent too frequently (rate limiting)

---

### 3. Heartbeat (Ping)

Sent periodically to measure latency and keep connection alive.

```typescript
{
  type: 'ping',
  clientTime: number       // Client timestamp (Date.now())
}
```

**Response**: Server sends `pong` with client and server timestamps.

---

## Server → Client Messages

### 1. Welcome

Sent after successful authentication. Contains match metadata.

```typescript
{
  type: 'welcome',
  playerId: string,        // Your unique player ID for this match
  matchId: string,         // Match/room ID
  seed: number,            // RNG seed for map generation
  tickRate: number,        // Server tick rate (default: 20)
  startInMs: number,       // Milliseconds until match starts (0 = already started)
  players: [               // All players in the match
    {
      id: string,
      displayName: string
    },
    ...
  ]
}
```

**Client Actions**:
- Store `playerId` and `matchId`
- Initialize map generator with `seed`
- Start game loop after `startInMs` delay

---

### 2. Snapshot

Broadcast to all players every tick (50ms at 20 Hz). Contains authoritative game state.

```typescript
{
  type: 'snapshot',
  tick: number,            // Server tick number
  serverTime: number,      // Server timestamp
  players: [               // All players in the match
    {
      id: string,
      x: number,           // Position X
      y: number,           // Position Y
      vx: number,          // Velocity X
      vy: number,          // Velocity Y
      state: 'skiing' | 'jumping' | 'crashed' | 'finished',
      distance: number,    // Distance traveled
      score: number,       // Current score
      isYou?: boolean      // True if this is your player
    },
    ...
  ],
  objectsDelta?: [         // Changed objects (pickups collected, obstacles hit)
    {
      id: string,
      type: 'tree' | 'rock' | 'speed_boost' | ...,
      x: number,
      y: number,
      removed?: boolean    // True if object was collected/destroyed
    },
    ...
  ],
  you: {
    ackSeq: number         // Last input sequence number server processed
  },
  events?: [               // Game events this tick
    {
      type: 'collision',
      playerId: string,
      objectId: string
    },
    {
      type: 'pickup',
      playerId: string,
      pickupType: 'speed_boost' | 'invulnerable' | 'score_multiplier'
    },
    {
      type: 'trick',
      playerId: string,
      score: number
    },
    {
      type: 'yeti_spawn',
      yetiId: string
    },
    {
      type: 'player_finished',
      playerId: string,
      placement: number
    }
  ]
}
```

**Client Actions**:
- Update rendering for all players
- Reconcile own player state using `ackSeq`
- Play sound effects for events

**Reconciliation**:
```typescript
1. Server acknowledged inputs up to `ackSeq`
2. Client removes inputs <= `ackSeq` from prediction buffer
3. For unacknowledged inputs (seq > ackSeq):
   - Rewind to server state
   - Re-apply unacked inputs
4. Update display with reconciled state
```

---

### 3. Heartbeat (Pong)

Response to client's `ping`.

```typescript
{
  type: 'pong',
  clientTime: number,      // Client timestamp from ping
  serverTime: number       // Server timestamp
}
```

**Client Actions**:
- Calculate RTT: `Date.now() - clientTime`
- Display latency in UI

---

### 4. Error

Sent when something goes wrong.

```typescript
{
  type: 'error',
  code: string,            // Error code (e.g., 'auth_failed', 'invalid_input')
  message: string          // Human-readable error message
}
```

**Common Errors**:
- `invalid_message` - Malformed message
- `auth_failed` - Authentication failed
- `match_full` - Room is full
- `match_not_found` - Invalid room code
- `rate_limit` - Too many messages
- `server_error` - Internal server error

---

### 5. Match End

Sent when the match ends. Contains final results.

```typescript
{
  type: 'match_end',
  finalResults: [
    {
      playerId: string,
      displayName: string,
      placement: number,   // 1st, 2nd, 3rd, etc.
      score: number,
      distance: number
    },
    ...
  ]
}
```

**Client Actions**:
- Show end-game screen with results
- Stop sending inputs
- Close WebSocket connection

---

## Example Flow

### 1. Player Joins Quick Race

```
Client: (WebSocket connects)

Client → Server:
{
  "type": "auth",
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "mode": "race"
}

Server → Client:
{
  "type": "welcome",
  "playerId": "player-abc123",
  "matchId": "match-xyz789",
  "seed": 42069,
  "tickRate": 20,
  "startInMs": 3000,
  "players": [
    { "id": "player-abc123", "displayName": "You" },
    { "id": "player-def456", "displayName": "Opponent1" }
  ]
}
```

### 2. Gameplay

```
Client → Server (every ~16ms):
{
  "type": "input",
  "seq": 1,
  "tick": 1,
  "dtMs": 16,
  "intent": { "steer": -0.5, "brake": 0, "tuck": 1, "jump": 0 }
}

Server → All Clients (every 50ms):
{
  "type": "snapshot",
  "tick": 10,
  "serverTime": 1234567890,
  "players": [
    {
      "id": "player-abc123",
      "x": 0,
      "y": 500,
      "vx": 0,
      "vy": 150,
      "state": "skiing",
      "distance": 500,
      "score": 500,
      "isYou": true
    },
    {
      "id": "player-def456",
      "x": 10,
      "y": 480,
      "vx": 1,
      "vy": 145,
      "state": "skiing",
      "distance": 480,
      "score": 480
    }
  ],
  "you": { "ackSeq": 1 },
  "events": []
}
```

### 3. Player Picks Up Power-Up

```
Server → All Clients:
{
  "type": "snapshot",
  "tick": 50,
  "players": [ ... ],
  "objectsDelta": [
    {
      "id": "pickup-speed-123",
      "type": "speed_boost",
      "x": 100,
      "y": 800,
      "removed": true
    }
  ],
  "you": { "ackSeq": 50 },
  "events": [
    {
      "type": "pickup",
      "playerId": "player-abc123",
      "pickupType": "speed_boost"
    }
  ]
}
```

### 4. Match Ends

```
Server → All Clients:
{
  "type": "match_end",
  "finalResults": [
    {
      "playerId": "player-abc123",
      "displayName": "You",
      "placement": 1,
      "score": 15000,
      "distance": 3500
    },
    {
      "playerId": "player-def456",
      "displayName": "Opponent1",
      "placement": 2,
      "score": 14500,
      "distance": 3400
    }
  ]
}

Client: (WebSocket closes)
```

---

## Rate Limiting

To prevent abuse:
- **Inputs**: Max 60 per second per client
- **Pings**: Max 1 per second
- **Auth**: Max 1 per connection

Exceeding limits results in temporary muting or disconnection.

---

## Security

- All messages validated with Zod schemas
- Server rejects out-of-range values (e.g., `steer` > 1.0)
- JWT token verified on auth
- Inputs with impossible physics changes are clamped or rejected

---

For implementation details, see `apps/server/src/ws/websocket-server.ts` and `apps/client/src/game/WebSocketClient.ts`.
