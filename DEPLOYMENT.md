# Deployment Guide

This guide covers deploying SkiPay to **Railway** with a **Neon PostgreSQL** database.

## Prerequisites

- Railway account (https://railway.app)
- Neon account (https://neon.tech)
- GitHub repository with your code
- Railway CLI (optional but recommended)

---

## Step 1: Set Up Neon Database

1. **Create a Neon project**
   - Go to https://neon.tech and sign up/login
   - Click "Create Project"
   - Choose a name (e.g., "skipay-prod")
   - Select a region close to your Railway deployment

2. **Get connection string**
   - In your Neon dashboard, click "Connection Details"
   - Copy the connection string (starts with `postgresql://...`)
   - Save it for later (you'll add it to Railway)

3. **Create database (optional)**
   - Neon creates a default database
   - If you want a specific name, use Neon's SQL editor to create it

---

## Step 2: Generate JWT Keys

Generate RSA key pair for JWT signing:

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem
```

**Format for Railway**:

You need to convert these to single-line strings with `\n` for newlines:

```bash
# macOS/Linux
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private.pem

awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public.pem
```

Copy the output (including `\n` characters). Example:

```
-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n
```

---

## Step 3: Deploy to Railway

### Option A: Using Railway Dashboard (Recommended)

1. **Create a new project**
   - Go to https://railway.app/dashboard
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Authorize Railway and select your repository

2. **Create two services**

Railway will detect the `railway.toml` and create two services automatically:
- `server` (backend)
- `client` (frontend)

If not, create them manually:

**Server Service**:
- Click "New Service" → "Empty Service"
- Name: `server`
- Settings → Dockerfile Path: `apps/server/Dockerfile`
- Settings → Root Directory: Leave empty (uses repo root)

**Client Service**:
- Click "New Service" → "Empty Service"
- Name: `client`
- Settings → Dockerfile Path: `apps/client/Dockerfile`
- Settings → Root Directory: Leave empty

3. **Configure environment variables**

**For `server` service**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_PRIVATE_KEY` | Private key from Step 2 (with `\n`) |
| `JWT_PUBLIC_KEY` | Public key from Step 2 (with `\n`) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `APP_ORIGIN` | `https://your-client-domain.railway.app` (see below) |
| `SMTP_DSN` | (Optional) SMTP URL for emails |
| `MATCH_TICK_RATE` | `20` (optional, default is fine) |

**For `client` service**:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://your-server-domain.railway.app` (see below) |
| `VITE_WS_URL` | `wss://your-server-domain.railway.app/ws` |

**Getting your Railway domains**:
- Each service gets a Railway domain like `something.railway.app`
- Find it in Settings → Domains
- Copy the full URL (e.g., `https://skipay-server-production.up.railway.app`)

4. **Update cross-references**

After first deploy, both services have domains. Update:

- Server's `APP_ORIGIN` → Client's domain
- Client's `VITE_API_BASE_URL` and `VITE_WS_URL` → Server's domain

Then redeploy the client (it needs to rebuild with new env vars).

5. **Run database migrations**

In Railway dashboard:
- Go to `server` service
- Click "Variables" → "Deployments"
- Find the latest deployment → "View Logs"
- Open a terminal (or use Railway CLI):

```bash
railway run pnpm prisma migrate deploy
railway run pnpm prisma db seed
```

Or manually via Railway CLI:

```bash
railway login
railway link    # Select your project
railway run --service=server pnpm prisma migrate deploy
railway run --service=server pnpm prisma db seed
```

---

### Option B: Using Railway CLI

1. **Install Railway CLI**

```bash
npm install -g @railway/cli
```

2. **Login**

```bash
railway login
```

3. **Initialize project**

```bash
railway init
```

Choose "Empty project" and give it a name.

4. **Link repository**

Railway will automatically link your GitHub repo if initialized from the dashboard. If not:

```bash
railway link
```

5. **Deploy**

```bash
railway up
```

This will deploy according to your `railway.toml` configuration.

6. **Set environment variables**

```bash
# Set variables for server
railway service server
railway variables set DATABASE_URL="your-neon-url"
railway variables set JWT_PRIVATE_KEY="your-private-key"
railway variables set JWT_PUBLIC_KEY="your-public-key"
# ... etc

# Set variables for client
railway service client
railway variables set VITE_API_BASE_URL="https://your-server.railway.app"
railway variables set VITE_WS_URL="wss://your-server.railway.app/ws"
```

7. **Run migrations**

```bash
railway run --service=server pnpm prisma migrate deploy
railway run --service=server pnpm prisma db seed
```

---

## Step 4: Verify Deployment

1. **Check server health**

Visit `https://your-server-domain.railway.app/healthz`

Expected response:
```json
{
  "ok": true,
  "commitSha": "...",
  "uptime": 123,
  "db": "ok"
}
```

2. **Check API docs**

Visit `https://your-server-domain.railway.app/docs`

Should show Swagger UI with API documentation.

3. **Test client**

Visit `https://your-client-domain.railway.app`

Should load the game homepage.

---

## Step 5: Custom Domains (Optional)

### Add custom domain to Railway:

1. Go to your service → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `skipay.app` for client, `api.skipay.app` for server)
4. Add CNAME record in your DNS provider:
   - Name: `@` (or `api`)
   - Value: Your Railway domain (e.g., `something.railway.app`)
5. Wait for DNS propagation (can take 1-48 hours)

### Update environment variables:

After custom domains are working:
- Update `APP_ORIGIN` on server
- Update `VITE_API_BASE_URL` and `VITE_WS_URL` on client
- Redeploy client

---

## CI/CD with GitHub Actions

The included `.github/workflows/ci.yml` runs on every push:

1. Lint and type check
2. Build all packages
3. Build Docker images

To add automatic deployment:

```yaml
# Add to .github/workflows/ci.yml after docker-build job

deploy:
  runs-on: ubuntu-latest
  needs: docker-build
  if: github.ref == 'refs/heads/main'

  steps:
    - name: Deploy to Railway
      uses: bervProject/railway-deploy@main
      with:
        railway_token: ${{ secrets.RAILWAY_TOKEN }}
        service: server

    - name: Deploy client to Railway
      uses: bervProject/railway-deploy@main
      with:
        railway_token: ${{ secrets.RAILWAY_TOKEN }}
        service: client
```

Add `RAILWAY_TOKEN` to GitHub secrets:
1. Get token: https://railway.app/account/tokens
2. GitHub repo → Settings → Secrets → New repository secret
3. Name: `RAILWAY_TOKEN`, Value: your token

---

## Monitoring & Logs

### View logs in Railway:

1. Dashboard → Select service → Deployments
2. Click on a deployment → "View Logs"
3. Real-time logs appear in the browser

### Common issues:

**Database connection fails**:
- Check `DATABASE_URL` is correct
- Ensure Neon database is running
- Check Railway's outbound IP is allowed (Neon defaults to allow all)

**Client can't connect to server**:
- Verify `VITE_API_BASE_URL` and `VITE_WS_URL` are correct
- Check CORS: `APP_ORIGIN` on server must match client domain
- Test with `curl https://your-server.railway.app/healthz`

**WebSocket connection fails**:
- Ensure using `wss://` (not `ws://`) in production
- Check Railway's WebSocket support is enabled (default: yes)

---

## Costs

### Free tier (as of 2024):

- **Railway**: $5 credit/month (execution time based)
- **Neon**: 1 free project with limits (sufficient for small app)

### Estimated monthly cost:

- Small app (<1000 users): Free tier should cover it
- Medium app (1000-10000 users): $20-50/month
- Large app (10000+ users): Scale horizontally, $200+/month

---

## Scaling

### Horizontal scaling (future):

1. Add Redis for shared state
2. Deploy multiple server instances
3. Use Railway's load balancer
4. Configure sticky sessions for WebSocket

See `ARCHITECTURE.md` for scaling strategies.

---

## Rollback

If deployment breaks:

### Railway Dashboard:
1. Go to service → Deployments
2. Find last working deployment
3. Click "..." → "Redeploy"

### Railway CLI:
```bash
railway rollback
```

---

## Backup Database

### Neon automated backups:

Neon automatically backs up your database. To restore:
1. Go to Neon dashboard
2. Select project → Branches
3. Create a new branch from a backup point
4. Update `DATABASE_URL` to new branch

### Manual backup:

```bash
railway run --service=server pg_dump $DATABASE_URL > backup.sql
```

Restore:
```bash
railway run --service=server psql $DATABASE_URL < backup.sql
```

---

## Support

- **Railway**: https://railway.app/help
- **Neon**: https://neon.tech/docs
- **Issues**: https://github.com/yourusername/skipay/issues

---

## Checklist

- [ ] Neon database created
- [ ] Connection string saved
- [ ] JWT keys generated
- [ ] Railway project created
- [ ] Server service configured
- [ ] Client service configured
- [ ] Environment variables set (both services)
- [ ] Cross-referenced domains updated
- [ ] Database migrated
- [ ] Database seeded
- [ ] Health check passes
- [ ] Client loads successfully
- [ ] Game works end-to-end
- [ ] (Optional) Custom domains configured
- [ ] (Optional) CI/CD set up

---

🎉 Your SkiPay game is now live!
