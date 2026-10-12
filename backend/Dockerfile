# Multi-stage production build for Vidya Backend Engine
# Stage 1: Build & TypeScript compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules if needed
RUN apk add --no-cache openssl

# Copy package manifests and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma Client
RUN npm ci
RUN npx prisma generate

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src/

# Build TypeScript to dist/
RUN npm run build

# Stage 2: Production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Install openssl for Prisma engine runtime
RUN apk add --no-cache openssl

# Security hardening: use non-root node user
USER node

# Copy package manifests and production dependencies
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy generated prisma runtime and compiled dist output
COPY --chown=node:node --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 4000

# Health check probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
