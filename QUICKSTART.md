# 🚀 Quick Start Guide

Get SkiPay running locally in 5 minutes.

## 1. Prerequisites Check

```bash
node --version   # Should be >= 20
pnpm --version   # Should be >= 8
```

Don't have pnpm? Install it:
```bash
npm install -g pnpm
```

## 2. Install Dependencies

```bash
pnpm install
```

This installs all packages in the monorepo.

## 3. Generate JWT Keys

```bash
cd apps/server

# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem

# View keys (copy these to .env)
cat private.pem
cat public.pem
```

## 4. Set Up Environment Variables

### Server

```bash
cd apps/server
cp .env.example .env
```

Edit `apps/server/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/skipay?schema=public"
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END RSA PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nYOUR_KEY_HERE\n-----END PUBLIC KEY-----"
APP_ORIGIN="http://localhost:5173"
NODE_ENV="development"
PORT=3000
```

**Important**: Replace `YOUR_KEY_HERE` with actual key content from step 3. Keep the `\n` characters for newlines.

### Client

```bash
cd apps/client
cp .env.example .env
```

The defaults in `apps/client/.env` should work for local dev:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
```

## 5. Set Up Database

### Option A: Use Neon (Recommended)

1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Paste it as `DATABASE_URL` in `apps/server/.env`

### Option B: Local PostgreSQL

Install PostgreSQL locally, then:

```bash
createdb skipay
```

Update `DATABASE_URL` in `apps/server/.env`:
```
DATABASE_URL="postgresql://yourusername@localhost:5432/skipay?schema=public"
```

## 6. Run Migrations & Seed

```bash
# From repo root
pnpm db:migrate
pnpm db:seed
```

You should see:
- Migration files applied
- 9 cosmetics created
- Demo user created

## 7. Start Development Servers

```bash
# From repo root - starts both client and server
pnpm dev
```

This runs:
- Client at http://localhost:5173
- Server at http://localhost:3000
- API Docs at http://localhost:3000/docs

## 8. Test the Game

1. **Open the client**: http://localhost:5173
2. **Play Solo**: Click "Play Solo" button
   - Use arrow keys or WASD to ski
   - Space to jump
   - Avoid obstacles, collect pickups!

3. **Test Authentication**:
   - Enter your email in the login form
   - Click "Send Link"
   - Check your **server console** for the magic link
   - Copy the URL and paste in browser
   - You should be logged in!

4. **Test Multiplayer** (need 2 tabs):
   - Login in first tab
   - Click "Quick Race"
   - Open second tab, login with different email
   - Click "Quick Race"
   - Both players should join the same match!

## Troubleshooting

### "Cannot find module @skipay/shared"

```bash
pnpm --filter @skipay/shared build
```

### "Prisma Client not generated"

```bash
cd apps/server
pnpm prisma generate
```

### Port already in use

Change `PORT` in `apps/server/.env` to something else (e.g., 3001), then update `VITE_API_BASE_URL` in client's `.env`.

### Database connection fails

- Double-check `DATABASE_URL` format
- If using Neon, ensure you copied the full connection string
- If using local PostgreSQL, ensure the database exists

### Magic links not showing

Magic links are **logged to the console** in development mode. Check your terminal where `pnpm dev` is running.

## Next Steps

- **Read ARCHITECTURE.md** to understand the system design
- **Read PROTOCOL.md** to understand WebSocket messages
- **Check DEPLOYMENT.md** to deploy to Railway
- **Explore the code** starting with:
  - Client: `apps/client/src/components/Home.tsx`
  - Server: `apps/server/src/index.ts`
  - Game: `apps/client/src/game/GameEngine.ts`

## Development Tips

### Hot Reload

Both client and server have hot reload:
- Client: Vite hot module replacement
- Server: tsx watch mode

Just save your files and changes apply automatically!

### Database Changes

After modifying `apps/server/prisma/schema.prisma`:

```bash
cd apps/server
pnpm prisma migrate dev --name your_change_description
```

### View Database

```bash
pnpm db:studio
```

Opens Prisma Studio in your browser to view/edit data.

### Lint & Type Check

```bash
pnpm lint
pnpm typecheck
```

Fix all errors before committing!

## Common Development Tasks

### Add a new obstacle type

1. Add to `ObstacleType` enum in `packages/shared/src/constants.ts`
2. Update map generator in `apps/server/src/physics/map-generator.ts`
3. Add rendering in `apps/client/src/game/Renderer.ts`

### Add a new API endpoint

1. Add route in `apps/server/src/routes/`
2. Register in `apps/server/src/index.ts`
3. Add schema in `packages/shared/src/protocol.ts`
4. Add API call in `apps/client/src/lib/api.ts`

### Add a new React component

1. Create file in `apps/client/src/components/`
2. Use Tailwind for styling (classes in `apps/client/src/index.css`)
3. Add route in `apps/client/src/App.tsx` if needed

---

**You're all set!** Start skiing ⛷️
