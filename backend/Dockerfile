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
RUN npm install
RUN npx prisma generate

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src/

# Build TypeScript to dist/ and compile seed script
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --module NodeNext --moduleResolution NodeNext --target ES2022

# Stage 2: Production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Install openssl for Prisma engine runtime
RUN apk add --no-cache openssl

# Copy package manifests and production dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm install --omit=dev

# Copy generated prisma runtime and compiled dist output
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist

# Security hardening: set ownership to node user
RUN chown -R node:node /app
USER node

EXPOSE 4000

# Health check probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/api/v1/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
