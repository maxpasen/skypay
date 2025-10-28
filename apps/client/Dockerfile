# Client Dockerfile
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/client/package.json ./apps/client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/client ./apps/client

# Build shared package
RUN pnpm --filter @skipay/shared build

# Build client
RUN pnpm --filter @skipay/client build

# Production stage - serve static files
FROM node:20-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/apps/client/dist ./dist

EXPOSE 8080

# Serve static files
CMD ["serve", "-s", "dist", "-l", "8080"]
