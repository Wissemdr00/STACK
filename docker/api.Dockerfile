FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./

# Copy libs
COPY libs ./libs

# Copy api app
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Build libs first
RUN pnpm --filter @video-render/types build
RUN pnpm --filter @video-render/schemas build
RUN pnpm --filter @video-render/constants build

# Build api
RUN pnpm --filter @video-render/api build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
