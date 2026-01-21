# Video Render Platform

A production-grade asynchronous video rendering platform built with NestJS, demonstrating distributed systems patterns, async job orchestration, and media processing pipelines.

## 🎯 Overview

This platform accepts declarative JSON timelines describing video compositions (images + text) and renders MP4 videos asynchronously using FFmpeg. It's designed as a portfolio-ready demonstration of:

- **Async Job Orchestration** with BullMQ
- **Media Processing Pipelines** with FFmpeg
- **Clean Backend Architecture** with NestJS modules
- **Real-World Failure Handling** with retries and error recovery

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   NestJS    │────▶│    Redis    │
│             │     │     API     │     │   (BullMQ)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  PostgreSQL │     │   Workers   │
                    │  (Job State)│◀────│  (FFmpeg)   │
                    └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   MinIO/S3  │
                                        │   (Videos)  │
                                        └─────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for development)
- pnpm (`npm install -g pnpm`)

### Start with Docker

```bash
# Clone and navigate to project
cd video-render-platform

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Development Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start infrastructure
docker-compose up postgres redis minio minio-init -d

# Run API (in one terminal)
pnpm dev:api

# Run Worker (in another terminal)
pnpm dev:worker
```

## 📡 API Reference

### Submit Render Job

```http
POST /jobs
Content-Type: application/json

{
  "timeline": {
    "clips": [
      {
        "image": "https://picsum.photos/1920/1080",
        "text": "Welcome to the video!",
        "duration": 3
      },
      {
        "image": "https://picsum.photos/1920/1080?random=2",
        "text": "This is the second scene",
        "duration": 5
      }
    ]
  },
  "callbackUrl": "https://your-app.com/webhook"
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Get Job Status

```http
GET /jobs/:id
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "outputUrl": "https://minio:9000/video-outputs/outputs/550e8400-e29b-41d4-a716-446655440000.mp4?signature=...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:45.000Z",
  "completedAt": "2024-01-15T10:30:45.000Z"
}
```

### Job Status Values

| Status | Description |
|--------|-------------|
| `queued` | Job is waiting in queue |
| `processing` | Worker is rendering the video |
| `completed` | Video is ready for download |
| `failed` | Job failed after all retries |

## 📁 Project Structure

```
video-render-platform/
├── apps/
│   ├── api/                    # NestJS API application
│   │   └── src/
│   │       ├── jobs/           # Job management module
│   │       ├── queue/          # BullMQ producer
│   │       ├── database/       # TypeORM configuration
│   │       └── common/         # Shared utilities
│   │
│   └── worker/                 # NestJS Worker application
│       └── src/
│           ├── processors/     # BullMQ job processors
│           ├── rendering/      # FFmpeg/Timeline logic
│           └── storage/        # S3 upload service
│
├── libs/                       # Shared libraries
│   ├── types/                  # TypeScript interfaces
│   ├── schemas/                # class-validator schemas
│   └── constants/              # Shared constants
│
├── docker/                     # Dockerfiles
├── docs/                       # Documentation
└── docker-compose.yml
```

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `S3_ENDPOINT` | S3/MinIO endpoint | `http://localhost:9000` |
| `S3_BUCKET` | Output bucket name | `video-outputs` |
| `WORKER_CONCURRENCY` | Parallel jobs per worker | `2` |
| `JOB_TIMEOUT_MS` | Max render time | `300000` (5 min) |

## 🔧 Technical Details

### Job Lifecycle

```
CLIENT                 API                 REDIS              WORKER              S3
   │                    │                    │                   │                │
   │─POST /jobs────────▶│                    │                   │                │
   │                    │─Create Job─────────│                   │                │
   │                    │─Enqueue────────────▶│                   │                │
   │◀──202 {jobId}──────│                    │                   │                │
   │                    │                    │─Dequeue──────────▶│                │
   │                    │                    │                   │─Download imgs──│
   │                    │                    │                   │─Run FFmpeg─────│
   │                    │                    │                   │─Upload MP4────▶│
   │                    │◀─Mark Complete─────│◀──────────────────│                │
   │─GET /jobs/:id─────▶│                    │                   │                │
   │◀──{status,url}─────│                    │                   │                │
```

### Failure Handling

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Invalid Input | class-validator | 400 response immediately |
| Image Download | Axios timeout | Retry with backoff |
| FFmpeg Crash | Non-zero exit | Retry up to 3 times |
| Timeout | BullMQ job timeout | Mark failed, cleanup |
| Worker Restart | Stalled job detection | Auto-retry stalled jobs |
| S3 Upload | AWS SDK error | Retry, then fail job |

### Rendering Pipeline

1. **Compile**: Timeline JSON → FFmpeg filter complex
2. **Download**: Fetch images to temp directory
3. **Render**: Execute FFmpeg with timeout
4. **Upload**: Stream output to S3
5. **Cleanup**: Remove temp files

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests (requires running services)
pnpm test:e2e

# Manual test
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "timeline": {
      "clips": [
        {"image": "https://picsum.photos/1920/1080", "text": "Hello", "duration": 3}
      ]
    }
  }'
```

## 📊 Monitoring

- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **PostgreSQL**: Connect at localhost:5432
- **Redis**: Connect at localhost:6379

## 📄 License

MIT
