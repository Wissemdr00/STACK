# 🎬 Video Render Platform

A **production-grade async video rendering system** built with NestJS, demonstrating distributed systems patterns, async job orchestration, and media processing pipelines.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-e0234e?logo=nestjs)](https://nestjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ What It Does

Submit a **declarative JSON timeline** describing a video (images + text overlays) → Get back a **rendered MP4 video**.

```json
{
  "timeline": {
    "clips": [
      { "image": "https://picsum.photos/1920/1080", "text": "Welcome!", "duration": 3 },
      { "image": "https://picsum.photos/1920/1080?random=2", "text": "Scene Two", "duration": 5 }
    ]
  }
}
```

The system handles everything asynchronously: queuing, rendering with FFmpeg, uploading to S3, and notifying you when it's done.

---

## 🚀 Quick Start (Try It Now!)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/video-render-platform.git
cd video-render-platform

# Start everything
docker-compose up -d

# Wait ~30 seconds for services to initialize, then open:
# 👉 http://localhost:8080 - Web UI
# 👉 http://localhost:9001 - MinIO Console (minioadmin/minioadmin)
```

That's it! Submit a render job through the web UI and watch the magic happen.

---

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   NestJS    │────▶│    Redis    │
│   Web UI    │     │     API     │     │   (BullMQ)  │
│   :8080     │     │    :3000    │     │    :6379    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  PostgreSQL │◀────│   Workers   │
                    │    :5432    │     │  (FFmpeg)   │
                    └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ MinIO (S3)  │
                                        │    :9000    │
                                        └─────────────┘
```

### Key Design Decisions

| Principle | Implementation |
|-----------|----------------|
| **Stateless API** | All state persisted to PostgreSQL |
| **Async Processing** | BullMQ job queue decouples API from heavy rendering |
| **Worker Isolation** | FFmpeg runs in dedicated containers, horizontally scalable |
| **Failure Handling** | 3 retries with exponential backoff, comprehensive error tracking |
| **Idempotency** | Same input always produces same output |

---

## 🛠️ Tech Stack

### Backend
- **NestJS** with Fastify adapter
- **TypeORM** for PostgreSQL
- **BullMQ** (Redis) for job queues
- **class-validator** for input validation

### Rendering
- **FFmpeg** for video processing
- Custom timeline compiler (JSON → FFmpeg commands)

### Frontend
- **Next.js 15** with App Router
- **shadcn/ui** components
- **Tailwind CSS**

### Infrastructure
- **Docker Compose** for local development
- **MinIO** (S3-compatible object storage)
- **PostgreSQL** for job persistence
- **Redis** for job queuing

---

## 📡 API Reference

### Submit Render Job

```http
POST /jobs
Content-Type: application/json

{
  "timeline": {
    "clips": [
      {
        "image": "https://example.com/image.jpg",
        "text": "Hello World",
        "duration": 3
      }
    ]
  },
  "callbackUrl": "https://your-webhook.com/notify"  // optional
}
```

**Response:** `202 Accepted`
```json
{ "jobId": "550e8400-e29b-41d4-a716-446655440000" }
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
  "outputUrl": "https://...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "completedAt": "2024-01-15T10:30:45.000Z"
}
```

### Job Statuses

| Status | Description |
|--------|-------------|
| `queued` | Waiting in queue |
| `processing` | FFmpeg is rendering |
| `completed` | Video ready for download |
| `failed` | Failed after retries |

---

## 📁 Project Structure

```
video-render-platform/
├── apps/
│   ├── api/            # NestJS REST API
│   ├── worker/         # Background job processor
│   └── web/            # Next.js demo UI
├── libs/
│   ├── types/          # Shared TypeScript interfaces
│   ├── schemas/        # Validation schemas
│   └── constants/      # Shared configuration
├── docker/             # Dockerfiles
├── docs/               # Additional documentation
└── docker-compose.yml
```

---

## 🔧 Development

### Local Setup (without Docker)

```bash
# Install dependencies
pnpm install

# Start infrastructure only
docker-compose up postgres redis minio minio-init -d

# Copy environment variables
cp .env.example .env

# Run API
pnpm dev:api

# Run Worker (separate terminal)
pnpm dev:worker

# Run Web UI (separate terminal)
cd apps/web && npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:api` | Start API in watch mode |
| `pnpm dev:worker` | Start worker in watch mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests |
| `docker-compose up -d` | Start full stack |
| `docker-compose logs -f` | View logs |

---

## 🧪 Testing the System

### Via Web UI
1. Open http://localhost:8080
2. Add clips with image URLs and text
3. Click "Submit Render Job"
4. Watch the status update in real-time
5. Download your rendered video!

### Via cURL
```bash
# Submit job
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"timeline":{"clips":[{"image":"https://picsum.photos/1920/1080","text":"Hello","duration":3}]}}'

# Check status
curl http://localhost:3000/jobs/{jobId}
```

---

## 📊 Monitoring

| Service | URL | Credentials |
|---------|-----|-------------|
| Web UI | http://localhost:8080 | - |
| API | http://localhost:3000 | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| PostgreSQL | localhost:5433 | postgres / postgres |

---

## 🔒 Failure Handling

The system is designed to be resilient:

- **Invalid Input:** Rejected immediately with 400 error
- **Image Download Failures:** Retry with exponential backoff
- **FFmpeg Crashes:** Up to 3 retries
- **Timeouts:** 5-minute max render time
- **Worker Crashes:** Stalled jobs automatically retried

See [docs/failure-handling.md](docs/failure-handling.md) for details.

---

## 🤝 Contributing

Contributions welcome! Please read the architecture docs first:

- [docs/architecture.md](docs/architecture.md) - System design
- [docs/rendering-pipeline.md](docs/rendering-pipeline.md) - FFmpeg details
- [docs/api.md](docs/api.md) - Full API reference

---

## 📄 License

MIT © Wissem dridi

---

<p align="center">
  <strong>Built with ❤️ to demonstrate production-grade backend engineering</strong>
</p>
