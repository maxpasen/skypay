# Architecture

## Overview

SkiPay is a multiplayer web game built with a **server-authoritative architecture** to prevent cheating and ensure fair gameplay. The system consists of three main parts:

1. **Shared Package** - Common types, schemas, and constants
2. **Server** - Authoritative game simulation, REST API, and WebSocket
3. **Client** - React UI with Canvas rendering and client-side prediction

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Client                            │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   React UI  │  │ Game Engine  │  │ WebSocket      │ │
│  │  (Menus,    │  │ (Canvas,     │  │ Client         │ │
│  │   HUD)      │  │  Input)      │  │                │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│         │                │                    │          │
└─────────┼────────────────┼────────────────────┼──────────┘
          │                │                    │
          │ REST API       │ Inputs (60Hz)      │
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                        Server                            │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Fastify    │  │ Match        │  │ Physics        │ │
│  │  REST API   │  │ Manager      │  │ Engine         │ │
│  │  (Auth,     │  │ (Rooms,      │  │ (Collisions,   │ │
│  │   Scores)   │  │  Tick Loop)  │  │  Movement)     │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│         │                │                    │          │
│         └────────────────┴────────────────────┘          │
│                          │                                │
│                          ▼                                │
│                  ┌──────────────┐                        │
│                  │   Prisma     │                        │
│                  │   (ORM)      │                        │
│                  └──────────────┘                        │
└──────────────────────────┼───────────────────────────────┘
                           │
                           ▼
                   ┌──────────────┐
                   │  PostgreSQL  │
                   │   (Neon)     │
                   └──────────────┘
```

## Server-Authoritative Model

### Why Server-Authoritative?

In multiplayer games, clients can be modified to cheat. To prevent this:
- **Server owns the truth** - All physics simulation happens server-side
- **Client is "dumb"** - Only sends inputs and renders what server says
- **Validation** - Server validates all inputs and state changes

### Tick Loop

The server runs a **deterministic tick loop** at 20 Hz (50ms per tick):

```typescript
Every 50ms:
  1. Read input queue for each player
  2. Simulate physics for all entities
  3. Check collisions
  4. Update game state
  5. Broadcast snapshot to all clients
```

### Client-Side Prediction

To hide latency, clients predict their own movement:

```typescript
1. Client sends input to server
2. Client immediately applies input locally (prediction)
3. Server processes input and sends authoritative state
4. Client reconciles: if mismatch, rewind and replay unacked inputs
```

This creates smooth movement even with 100ms latency.

## Data Flow

### Solo Game

```
User Input → Input Manager → Game Engine → Canvas Render
                    ↓
              (Optional: Submit score to API)
```

### Multiplayer Game

```
User Input → Input Manager → WebSocket Client
                                    ↓
                            [Sent to Server]
                                    ↓
Server: Tick Loop → Physics → Snapshot
                                    ↓
                         [Broadcast to Clients]
                                    ↓
WebSocket Client → Game Engine → Reconcile → Canvas Render
```

## Database Schema

### Core Tables

- **users** - User accounts (email, display name)
- **sessions** - JWT session tracking
- **magic_link_tokens** - Passwordless auth tokens
- **runs** - Solo game runs (score, distance, etc.)
- **matches** - Multiplayer match metadata
- **match_players** - Players in matches with final scores
- **cosmetics** - Available cosmetic items
- **user_cosmetics** - Unlocked and equipped cosmetics
- **event_logs** - Analytics and debugging

### Indexes

Key indexes for performance:
- `users.email` (unique)
- `runs.userId, runs.score, runs.startedAt` (leaderboard queries)
- `matches.status` (active match lookup)

## Authentication Flow

### Magic Link Login

```
1. User enters email → POST /auth/magic-link
2. Server generates token, stores hash in DB
3. Server sends email with link (or logs in dev mode)
4. User clicks link → GET /auth/callback?token=...
5. Server verifies token, creates session
6. Server signs JWT, sets HTTP-only cookie
7. Redirect to app (authenticated)
```

### JWT Structure

```json
{
  "sub": "user-uuid",
  "jti": "session-uuid",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234999999
}
```

Signed with RS256 (asymmetric keys) for security.

## Map Generation

Maps are **deterministically generated** using a seeded PRNG:

```
Seed (match-specific) → PRNG → Chunk Generator
                                      ↓
                        [Obstacles, pickups, terrain]
                                      ↓
                        Same seed = same map for all players
```

### Chunk System

- World divided into 1024x1024 chunks
- Generated on-demand as players progress
- Obstacles placed with density parameters
- Guaranteed clear path in center

## Anti-Cheat Measures

1. **Server-authoritative physics** - Client can't modify position/speed
2. **Input validation** - Check for impossible values (e.g., speed > max)
3. **Rate limiting** - Prevent spam of inputs or API calls
4. **Sequence numbers** - Detect replayed or out-of-order inputs
5. **State validation** - Server checks acceleration, teleportation, etc.

## Performance Considerations

### Server

- **Tick rate**: 20 Hz (lower = less CPU, higher latency)
- **Object culling**: Only send nearby objects to clients
- **Delta snapshots**: Only send changed state (future optimization)
- **Horizontal scaling**: Use Redis for shared state (v2)

### Client

- **Canvas rendering**: 60 FPS target
- **Object pooling**: Reuse particle/object instances
- **requestAnimationFrame**: Smooth frame timing
- **Throttle inputs**: Send at 60 Hz max (batched)

## Scalability Path

### Current (v1)

- Single server instance
- In-memory match state
- Direct WebSocket connections
- Good for ~100 concurrent players

### Future (v2)

- Redis for shared match state
- Load balancer with sticky sessions
- Multiple server instances
- WebSocket gateway for routing
- Can scale to 1000s of players

## Tech Choices Rationale

| Choice | Why? |
|--------|------|
| **Fastify** | Fast, low-overhead, good plugin ecosystem |
| **ws** | Lightweight, no unnecessary abstractions |
| **Prisma** | Type-safe ORM, great migrations, Neon support |
| **Canvas API** | Lightweight, full control, 60 FPS possible |
| **Vite** | Fast dev server, optimal production builds |
| **pnpm** | Faster than npm/yarn, efficient disk usage |
| **Monorepo** | Shared types between client/server |

## Directory Deep Dive

### Server Structure

```
apps/server/src/
├── auth/           # Magic link & JWT utilities
├── routes/         # Fastify route handlers
│   ├── auth.ts     # Login, logout, /me
│   └── game.ts     # Runs, leaderboards, cosmetics
├── ws/             # WebSocket server & handlers
├── match/          # Match lifecycle & tick loop
├── physics/        # Physics engine & collision
│   ├── engine.ts   # Core physics simulation
│   ├── types.ts    # Physics type definitions
│   └── map-generator.ts # Deterministic map gen
└── lib/            # Shared utilities
    ├── config.ts   # Env config
    ├── db.ts       # Prisma client
    ├── logger.ts   # Pino logger
    └── prng.ts     # Seeded random number generator
```

### Client Structure

```
apps/client/src/
├── game/           # Core game engine
│   ├── GameEngine.ts    # Main game loop
│   ├── Renderer.ts      # Canvas rendering
│   ├── Input.ts         # Keyboard & touch input
│   ├── WebSocketClient.ts # Multiplayer connection
│   └── PRNG.ts          # Client-side map generation
├── components/     # React UI
│   ├── Home.tsx    # Landing page
│   ├── Game.tsx    # Game view
│   └── Leaderboard.tsx # Leaderboard view
└── lib/            # Utilities
    ├── api.ts      # REST API client
    └── store.ts    # Zustand state management
```

---

For protocol details, see [PROTOCOL.md](./PROTOCOL.md).
