FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./

# Copy libs
COPY libs ./libs

# Copy worker app
COPY apps/worker ./apps/worker

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Build libs first
RUN pnpm --filter @video-render/types build
RUN pnpm --filter @video-render/schemas build
RUN pnpm --filter @video-render/constants build

# Build worker
RUN pnpm --filter @video-render/worker build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install FFmpeg
RUN apk add --no-cache ffmpeg

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/node_modules ./apps/worker/node_modules

# Create temp directory for rendering
RUN mkdir -p /tmp/video-render

CMD ["node", "apps/worker/dist/main.js"]
