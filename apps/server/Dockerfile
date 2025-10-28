# Server Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8

# Set working directory
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Build shared package
RUN pnpm --filter @skipay/shared build

# Generate Prisma client
RUN cd apps/server && pnpm prisma generate

# Build server
RUN pnpm --filter @skipay/server build

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm@8

WORKDIR /app

# Copy built files and dependencies
COPY --from=base /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared/package.json ./packages/shared/
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/apps/server/package.json ./apps/server/
COPY --from=base /app/apps/server/dist ./apps/server/dist
COPY --from=base /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=base /app/apps/server/prisma ./apps/server/prisma

WORKDIR /app/apps/server

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start server
CMD ["pnpm", "start"]
