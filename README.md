# ⛷️ SkiPay

A modern, production-ready SkiFree-like endless downhill ski game with multiplayer support.

## Features

- 🎮 **Smooth 60 FPS gameplay** with Canvas rendering
- 🏁 **Multiplayer racing** with server-authoritative physics and client-side prediction
- 🏆 **Leaderboards** with daily, weekly, and all-time rankings
- 🔐 **Passwordless authentication** via magic link
- 📱 **Mobile-friendly** with touch controls
- 🎨 **Customizable cosmetics** (skis, suits, hats)
- ⚡ **Real-time WebSocket** communication at 20 Hz tick rate
- 🛡️ **Anti-cheat** with server-side validation

## Tech Stack

- **Frontend**: Vite + React + TypeScript + Canvas API
- **Backend**: Node.js + Fastify + WebSocket
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: Magic link (JWT with RS256)
- **Deployment**: Railway + Neon
- **Monorepo**: pnpm workspaces

## Project Structure

```
skipay/
├── packages/
│   └── shared/          # Shared types, schemas, constants
├── apps/
│   ├── server/          # Fastify + WebSocket server
│   │   ├── src/
│   │   │   ├── auth/    # Magic link & JWT
│   │   │   ├── routes/  # REST API
│   │   │   ├── ws/      # WebSocket handler
│   │   │   ├── match/   # Match & room management
│   │   │   ├── physics/ # Server-side physics
│   │   │   └── lib/     # Utilities (PRNG, config, etc.)
│   │   └── prisma/      # Database schema & migrations
│   └── client/          # Vite + React app
│       └── src/
│           ├── game/    # Game engine (Canvas, Input, Physics)
│           ├── components/ # React UI
│           └── lib/     # API client & state
└── railway.toml         # Railway deployment config
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 8
- PostgreSQL (or Neon account)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/skipay.git
cd skipay
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

Server (`.env` in `apps/server/`):

```bash
cd apps/server
cp .env.example .env
```

Edit `.env` with your values:
- `DATABASE_URL`: Your Neon/PostgreSQL connection string
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`: Generate with OpenSSL (see below)
- `SMTP_DSN`: (Optional) For production email sending

Generate JWT keys:
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
# Copy contents to .env (include \\n for line breaks)
```

Client (`.env` in `apps/client/`):

```bash
cd apps/client
cp .env.example .env
# Defaults should work for local dev
```

4. **Set up database**

```bash
# From root
pnpm db:migrate
pnpm db:seed
```

5. **Start development servers**

```bash
# From root - starts both client and server
pnpm dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000
- API Docs: http://localhost:3000/docs

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev servers (client + server)
pnpm dev

# Build all packages
pnpm build

# Lint code
pnpm lint

# Type check
pnpm typecheck

# Run tests
pnpm test

# Database commands
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed database
pnpm db:studio      # Open Prisma Studio
```

## Gameplay

### Controls

**Desktop:**
- `←` / `→` or `A` / `D`: Steer
- `↑` or `W`: Tuck (speed boost)
- `↓` or `S`: Brake
- `Space`: Jump

**Mobile:**
- On-screen buttons for left/right and jump

### Game Modes

- **Solo**: Practice offline, scores saved if logged in
- **Quick Race**: Auto-matchmaking for up to 8 players
- **Friends** (Coming soon): Create private rooms with codes

### Obstacles & Pickups

- **Obstacles**: Trees, rocks, stumps, snowmen (crash on hit)
- **Jumps**: Ramps for aerial tricks and bonus points
- **Pickups**: Speed boost, invulnerability, score multiplier
- **Yeti**: Appears after 2000m and chases you!

## Deployment

### Railway + Neon

1. **Create a Neon database**
   - Sign up at https://neon.tech
   - Create a new project
   - Copy the connection string

2. **Deploy to Railway**
   - Install Railway CLI: `npm i -g @railway/cli`
   - Login: `railway login`
   - Initialize: `railway init`
   - Deploy: `railway up`

3. **Set environment variables**

In Railway dashboard, set for **server**:
```
DATABASE_URL=<your-neon-connection-string>
JWT_PRIVATE_KEY=<your-private-key>
JWT_PUBLIC_KEY=<your-public-key>
APP_ORIGIN=<your-client-url>
NODE_ENV=production
SMTP_DSN=<optional-smtp-url>
```

In Railway dashboard, set for **client**:
```
VITE_API_BASE_URL=<your-server-url>
VITE_WS_URL=<your-server-ws-url>
```

4. **Run migrations**

```bash
railway run pnpm db:deploy
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Architecture

The app uses a **server-authoritative multiplayer architecture**:

1. **Client** sends inputs to server at 60 Hz
2. **Server** simulates physics at 20 Hz tick rate
3. **Server** broadcasts snapshots to all clients
4. **Client** performs prediction and reconciliation

For details, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [PROTOCOL.md](./PROTOCOL.md) - WebSocket protocol spec

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Roadmap / TODOs for v2

- [ ] Cosmetics shop with unlockables
- [ ] Voice chat in multiplayer
- [ ] Party system for friends
- [ ] Redis for horizontal scaling
- [ ] Spectator mode
- [ ] Replay system
- [ ] More obstacle types and power-ups
- [ ] Daily challenges
- [ ] Achievements

## License

MIT License - see [LICENSE](./LICENSE)

## Credits

Inspired by the classic SkiFree by Chris Pirih (1991).

---

Built with ❤️ using TypeScript, React, and Fastify.
