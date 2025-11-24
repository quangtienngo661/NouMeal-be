# stage 1: install production dependencies (uses package-lock for reproducible install)
FROM node:20-alpine AS deps
WORKDIR /app

# system deps for some native modules (only if needed) — comment/remove nếu không cần
RUN apk add --no-cache python3 make g++ || true

COPY package.json package-lock.json ./
# npm ci is faster and reproducible; --omit=dev to skip dev deps
RUN npm ci --omit=dev

# stage 2: copy app source
FROM node:20-alpine AS builder
WORKDIR /app

# copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# copy app sources
COPY . .

# If you have a build step (TypeScript / bundler), uncomment:
# RUN npm run build

# stage 3: runtime, minimal image
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV BE_PORT=5000

# create non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# copy only what we need from builder
COPY --from=builder /app ./

# change ownership to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE ${BE_PORT}

# basic http healthcheck (requires wget available). If your image doesn't include wget, remove or adjust.
RUN apk add --no-cache wget || true
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${BE_PORT} || exit 1

# Use npm start as default. Make sure package.json includes a "start" script.
CMD ["npm", "run", "start"]
