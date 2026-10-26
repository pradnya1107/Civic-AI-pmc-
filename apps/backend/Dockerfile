# Multi-stage production Dockerfile for CivicAI Backend
# Stage 1: Build & compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.10.1 --activate

# Copy workspace manifest and configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install dependencies and compile TypeScript
RUN pnpm install --frozen-lockfile
RUN pnpm --filter backend build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for healthcheck
RUN apk add --no-cache curl

RUN corepack enable && corepack prepare pnpm@12.10.1 --activate

# Copy workspace setup for production install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/backend/package.json ./apps/backend/

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy compiled JavaScript output from builder
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Use non-root node user for security
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

CMD ["node", "apps/backend/dist/server.js"]
