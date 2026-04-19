# ==============================================================================
# Telegram Media Proxy - Production Dockerfile
# Multi-stage build for minimal image size
# ==============================================================================

# Stage 1: Build the Vite app with proxy plugin
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY proxy/package.json ./proxy/

# Install dependencies
RUN npm ci --quiet

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS production

WORKDIR /app

# Add labels
LABEL org.opencontainers.image.title="EduSafa Learning with Telegram Media Proxy"
LABEL org.opencontainers.image.description="Educational platform with Telegram file proxy"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.authors="EduSafa Team"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV PROXY_CACHE_TTL=600
ENV PROXY_MAX_RETRIES=3
ENV PROXY_RATE_LIMIT_WINDOW=60000
ENV PROXY_RATE_LIMIT_MAX_REQUESTS=30
ENV PROXY_LOG_LEVEL=info

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "serve", "dist", "-l", "3000", "-s", "--cors"]
