FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY apps/web/package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY apps/web .

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
