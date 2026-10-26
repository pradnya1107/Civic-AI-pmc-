# Multi-stage production Dockerfile for CivicAI Web / Frontend
# Stage 1: Build Vite React application
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.10.1 --activate

# Copy workspace manifest and configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/frontend ./apps/frontend

# Install dependencies and build production bundle
RUN pnpm install --frozen-lockfile
RUN pnpm --filter frontend build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine AS runner

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend bundle from builder stage
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
