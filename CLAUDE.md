# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SkiPay** is a production-ready multiplayer web game inspired by SkiFree. It's an endless downhill skiing game with real-time multiplayer racing, built using modern TypeScript and deployed on Railway + Neon.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Client**: Vite + React + TypeScript + HTML5 Canvas
- **Server**: Node.js + Fastify + WebSocket (ws library)
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: Passwordless magic link → JWT (RS256)
- **Deployment**: Railway (Docker containers) + Neon database

## Common Commands

### Development

```bash
# Install all dependencies
pnpm install

# Start both client and server in dev mode
pnpm dev

# Build all packages
pnpm build

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

### Database

```bash
# Run migrations (development)
pnpm db:migrate

# Deploy migrations (production)
cd apps/server && pnpm prisma migrate deploy

# Seed database with default cosmetics
pnpm db:seed

# Open Prisma Studio
pnpm db:studio

# Generate Prisma client (after schema changes)
cd apps/server && pnpm prisma generate
```

### Package-Specific

```bash
# Build shared package only
pnpm --filter @skipay/shared build

# Run server only
pnpm --filter @skipay/server dev

# Run client only
pnpm --filter @skipay/client dev

# Run tests for a specific package
pnpm --filter @skipay/server test
pnpm --filter @skipay/client test

# Run a single test file
cd apps/server && pnpm vitest src/lib/prng.test.ts
```

## Architecture

### Monorepo Structure

```
packages/shared/    # Shared types, Zod schemas, constants (TypeScript)
apps/server/        # Backend API + WebSocket server (Fastify)
apps/client/        # Frontend web app (Vite + React)
```

### Server-Authoritative Multiplayer

- **Server** runs physics simulation at 20 Hz tick rate
- **Client** sends inputs at up to 60 Hz
- **Client-side prediction** with reconciliation to hide latency
- **Anti-cheat**: Server validates all inputs and state changes

### Key Files

**Server:**
- `apps/server/src/index.ts` - Main entry point, Fastify setup
- `apps/server/src/auth/magic-link.ts` - Passwordless authentication
- `apps/server/src/routes/` - REST API endpoints
- `apps/server/src/ws/websocket-server.ts` - WebSocket handler
- `apps/server/src/match/match-manager.ts` - Game room management, tick loop
- `apps/server/src/physics/engine.ts` - Physics simulation
- `apps/server/src/physics/map-generator.ts` - Deterministic map generation with PRNG
- `apps/server/prisma/schema.prisma` - Database schema

**Client:**
- `apps/client/src/main.tsx` - React entry point
- `apps/client/src/App.tsx` - React Router setup
- `apps/client/src/components/` - React UI components
- `apps/client/src/game/GameEngine.ts` - Main game loop
- `apps/client/src/game/Renderer.ts` - Canvas rendering
- `apps/client/src/game/Input.ts` - Keyboard & touch input
- `apps/client/src/game/WebSocketClient.ts` - Multiplayer connection

**Shared:**
- `packages/shared/src/constants.ts` - Game constants (speeds, physics)
- `packages/shared/src/protocol.ts` - WebSocket message schemas (Zod)

## Code Conventions

### TypeScript

- Strict mode enabled everywhere
- Use explicit types for function parameters
- Prefer `interface` for objects, `type` for unions
- All WebSocket messages validated with Zod schemas

### Naming

- Files: PascalCase for classes/components, kebab-case for utilities
- React components: PascalCase, `.tsx` extension
- Server modules: camelCase, `.ts` extension
- Database: snake_case for table/column names

### State Management

- Client: Zustand for global state (`apps/client/src/lib/store.ts`)
  - User info, game stats (score, distance), playing state
- Server: In-memory match state in `Match` class instances
  - Each match instance manages its own players, physics, and tick loop
  - Stateless server design enables horizontal scaling with Redis (v2)

### Error Handling

- Server: Use Fastify's error handling, return proper HTTP codes
- Client: Try/catch with user-friendly messages
- WebSocket: Send `error` message type with code + message

## Important Constants

All game constants are in `packages/shared/src/constants.ts`:

- `GAME_CONSTANTS.SERVER_TICK_RATE` - 20 Hz (server simulation frequency)
- `GAME_CONSTANTS.MAX_SPEED` - 500 units/sec
- `GAME_CONSTANTS.CHUNK_SIZE` - 1024 units (map generation)
- `MAP_CONFIG` - Obstacle densities and spawn parameters

**Critical:** When modifying physics constants:
1. Update `packages/shared/src/constants.ts` first
2. Update server physics in `apps/server/src/physics/engine.ts`
3. Client prediction automatically uses shared constants
4. Test in multiplayer to verify sync remains correct

## Database

### Schema

- **users**: User accounts (email, displayName)
- **sessions**: JWT session tracking
- **magic_link_tokens**: One-time login tokens
- **runs**: Solo game results
- **matches**: Multiplayer game metadata
- **match_players**: Players in matches with scores
- **cosmetics**: Available items (skis, suits, hats)
- **user_cosmetics**: Owned and equipped items

### Migrations

Always create migrations, never modify Prisma schema directly in production:

```bash
cd apps/server
pnpm prisma migrate dev --name description_of_change
```

## Testing

Test infrastructure is configured with Vitest. Example tests included:

```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm --filter @skipay/server test:ui

# Run with coverage
pnpm --filter @skipay/server test:coverage

# Run specific test file
cd apps/server && pnpm vitest src/lib/prng.test.ts
```

**Test locations:**
- `apps/server/src/**/*.test.ts` - Server unit tests (PRNG, physics engine)
- `apps/client/src/**/*.test.ts` - Client unit tests
- Test setup: `apps/client/src/test/setup.ts`

**Writing tests:**
- Use Vitest for unit/integration tests
- Place test files next to source files with `.test.ts` extension
- Example tests: `prng.test.ts`, `engine.test.ts`

## Deployment

See `DEPLOYMENT.md` for full guide.

**Quick deploy to Railway:**

1. Create Neon database, copy connection string
2. Generate JWT keys (OpenSSL)
3. Push to GitHub
4. Connect Railway to GitHub repo
5. Set environment variables in Railway dashboard
6. Run `railway run pnpm prisma migrate deploy`

**Environment variables needed:**

Server:
- `DATABASE_URL`
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`
- `APP_ORIGIN` (client URL)
- `NODE_ENV=production`

Client:
- `VITE_API_BASE_URL` (server URL)
- `VITE_WS_URL` (server WebSocket URL)

## Troubleshooting

### "Cannot find module @skipay/shared"

The shared package must be built before other packages can import it:

```bash
# Rebuild shared package
pnpm --filter @skipay/shared build

# Or rebuild everything
pnpm build
```

The `postinstall` script should auto-build shared, but may fail on first install.

### Database connection fails

- Check `DATABASE_URL` in `apps/server/.env`
- Ensure Neon database is running
- Run migrations: `pnpm db:migrate`
- Verify database exists and credentials are correct

### WebSocket connection fails

- Check CORS: Server's `APP_ORIGIN` must match client URL
- Ensure using `wss://` in production (not `ws://`)
- Verify firewall allows WebSocket connections
- Check browser console for connection errors

### "Prisma Client not generated"

```bash
cd apps/server
pnpm prisma generate
```

### Server won't start / Module errors

```bash
# Clean install (removes all node_modules and rebuilds)
pnpm clean
pnpm install
pnpm build
```

### Magic link not appearing

In development, magic links are logged to the **server console**, not sent via email. Check terminal output where `pnpm dev` is running.

## Adding New Features

### New REST API endpoint

1. Add Zod schema in `packages/shared/src/protocol.ts`
2. Add route handler in `apps/server/src/routes/` (use existing files or create new)
3. Register route in `apps/server/src/index.ts` (use `fastify.register()`)
4. Add API call in `apps/client/src/lib/api.ts`
5. Update OpenAPI docs if needed (auto-generated from Zod schemas)

### New game mechanic (e.g., power-up, obstacle type)

1. Add type to enum in `packages/shared/src/constants.ts` (e.g., `ObstacleType`, `PickupType`)
2. Add constants if needed in `GAME_CONSTANTS` or `MAP_CONFIG`
3. Implement server-side logic in `apps/server/src/physics/engine.ts`
4. Update map generator in `apps/server/src/physics/map-generator.ts` if it spawns
5. Add rendering in `apps/client/src/game/Renderer.ts` (draw method in `drawObject()`)
6. Test solo first, then multiplayer to verify synchronization

### New UI component

1. Create component file in `apps/client/src/components/` (PascalCase.tsx)
2. Use Tailwind utility classes (see `apps/client/src/index.css` for custom classes)
3. Import in `App.tsx` and add `<Route>` if it's a page
4. Connect to Zustand store if it needs global state (`apps/client/src/lib/store.ts`)

### New database table

1. Update `apps/server/prisma/schema.prisma`
2. Create migration: `cd apps/server && pnpm prisma migrate dev --name add_feature_name`
3. Update seed script if needed: `apps/server/prisma/seed.ts`
4. Prisma client will auto-regenerate with new types

## Key Design Decisions

### Why server-authoritative?

Prevents cheating. Client can be modified, server can't. All physics simulation happens server-side.

### Why Canvas instead of WebGL/game engine?

Lightweight, 60 FPS achievable with simple 2D graphics. No need for heavy 3D engine.

### Why Fastify instead of Express?

Faster, built-in TypeScript support, better plugin system, native async/await.

### Why Prisma instead of raw SQL?

Type-safe queries, automatic migrations, works great with TypeScript.

### Why magic link instead of password?

Better UX, no password management, reduces security risk (no password leaks).

## Performance Tips

### Server

- Tick rate is 20 Hz (50ms) - don't lower unless necessary
- Object culling: Only send nearby objects to clients (already implemented)
- Rate limit WebSocket messages (implemented)

### Client

- Canvas rendering at 60 FPS target
- Avoid creating new objects in game loop (causes GC pauses)
- Use `requestAnimationFrame` for smooth rendering
- Batch WebSocket sends if possible

## Security Notes

- JWT keys must be RS256 (asymmetric) - never commit private keys
- All WebSocket messages validated with Zod
- Server checks for impossible physics (teleportation, speed hacks)
- Rate limiting on API endpoints and WebSocket
- CORS configured to allow only client origin
- HTTP-only cookies for JWT tokens

## Documentation

- `README.md` - Getting started, features, commands
- `QUICKSTART.md` - 5-minute setup guide (start here!)
- `ARCHITECTURE.md` - System design, data flow, scaling
- `PROTOCOL.md` - WebSocket message specification (client ↔ server)
- `DEPLOYMENT.md` - Railway + Neon deployment guide
- `CONTRIBUTING.md` - Code style, workflow, PR process
- `PROJECT_SUMMARY.md` - Complete feature list and statistics
- `DOCS_INDEX.md` - Navigation guide for all documentation

## Future TODOs (v2)

- [ ] Implement comprehensive tests (Vitest + Playwright)
- [ ] Add Redis for horizontal scaling
- [ ] Cosmetics shop with purchase system
- [ ] Voice chat in multiplayer
- [ ] Spectator mode
- [ ] Replay system
- [ ] Daily challenges and achievements

## Contact

For questions or issues:
- Check existing documentation first
- Open an issue on GitHub
- See `CONTRIBUTING.md` for contribution guidelines
