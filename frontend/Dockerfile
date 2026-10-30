# ==============================================================================
# CodeMind AI - Frontend Production Dockerfile
# Multi-stage build with Node 20 Alpine & Nginx Alpine runtime
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Optimize Vite SPA
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Clean deterministic install
RUN npm ci

# Copy source tree and configuration
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

# Build production bundle into /app/dist
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Runtime
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

LABEL maintainer="CodeMind AI Engineering <admin@codemind.ai>"
LABEL description="CodeMind AI Web Interface (Nginx Alpine)"

# Install curl for health check
RUN apk add --no-cache curl

# Remove default Nginx welcome site
RUN rm -rf /usr/share/nginx/html/*

# Copy built SPA bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom production Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose standard HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
