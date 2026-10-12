# Multi-stage production build for Vidya Frontend PWA
# Stage 1: Build & Vite bundling
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code, config & public assets
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY public ./public/
COPY src ./src/

# Compile TypeScript and Vite production bundle
RUN npm run build

# Stage 2: Production Nginx static server
FROM nginx:1.27-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled SPA bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Nginx health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
