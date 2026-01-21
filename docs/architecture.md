# Architecture Overview

## System Design

The Video Render Platform is designed as a distributed system with clear separation of concerns between API handling, job orchestration, and rendering execution.

### Core Principles

1. **API Statelessness**: The API server maintains no session state. All job state is persisted to PostgreSQL.

2. **Async Processing**: Video rendering is fully decoupled from HTTP request handling through BullMQ job queues.

3. **Worker Isolation**: Render workers are independent processes that can be scaled horizontally.

4. **Idempotency**: Jobs can be safely retried without side effects. The same input always produces the same output.

5. **Determinism**: JSON timeline → video transformation is deterministic and reproducible.

## Component Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  HTTP Clients / Webhooks / Frontend Applications                    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  JobsController │  │  JobsService    │  │  JobsRepository │          │
│  │  POST /jobs     │──│  Validation     │──│  TypeORM CRUD   │          │
│  │  GET /jobs/:id  │  │  Business Logic │  │                 │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  QueueModule: BullMQ Producer                                        ││
│  │  Enqueues render jobs with retry configuration                       ││
│  └─────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            Queue Layer (Redis)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  render-queue                                                        │ │
│  │  - Waiting jobs                                                      │ │
│  │  - Active jobs (locked)                                              │ │
│  │  - Completed jobs (TTL)                                              │ │
│  │  - Failed jobs (for inspection)                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            Worker Layer                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  RenderProcessor (BullMQ Consumer)                                   │ │
│  │  - Dequeues jobs                                                     │ │
│  │  - Manages job lifecycle                                             │ │
│  │  - Handles errors and retries                                        │ │
│  └────────────────────────────┬────────────────────────────────────────┘ │
│                               │                                          │
│  ┌────────────────────────────┼────────────────────────────────────────┐ │
│  │                  Rendering Pipeline                                  │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │ │
│  │  │ Timeline      │  │ FFmpeg        │  │ S3            │           │ │
│  │  │ Compiler      │──│ Runner        │──│ Service       │           │ │
│  │  │ JSON→Command  │  │ Execution     │  │ Upload        │           │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘           │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           Storage Layer                                   │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐│
│  │  PostgreSQL                      │  │  MinIO/S3                       ││
│  │  - Job records                   │  │  - Rendered videos              ││
│  │  - Status history                │  │  - Signed URL access            ││
│  │  - Error details                 │  │                                 ││
│  └─────────────────────────────────┘  └─────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

## NestJS Module Structure

```
AppModule (API)
├── ConfigModule (Global)
│   └── Environment variable management
├── DatabaseModule
│   └── TypeORM PostgreSQL connection
├── QueueModule (Global)
│   └── BullMQ producer setup
└── JobsModule
    ├── JobsController
    ├── JobsService
    └── JobsRepository

WorkerModule
├── ConfigModule (Global)
├── TypeOrmModule
│   └── Job entity registration
├── BullModule
│   └── Queue consumer setup
└── Providers
    ├── RenderProcessor
    ├── TimelineCompiler
    ├── FFmpegRunner
    └── S3Service
```

## Data Flow

### Job Submission

```
1. Client POST /jobs with timeline JSON
2. JobsController receives request
3. ValidationPipe validates DTO with class-validator
4. JobsService validates business rules (clip count, duration)
5. JobsRepository creates job record (status: QUEUED)
6. RenderQueueService enqueues job to Redis
7. API returns 202 Accepted with jobId
```

### Job Processing

```
1. RenderProcessor dequeues job from Redis
2. Update job status to PROCESSING in PostgreSQL
3. TimelineCompiler downloads images to temp directory
4. TimelineCompiler generates FFmpeg filter complex
5. FFmpegRunner executes FFmpeg command
6. S3Service uploads rendered MP4
7. Update job status to COMPLETED with output URL
8. Send webhook callback (if configured)
9. Cleanup temp directory
```

### Error Recovery

```
On Failure:
1. Catch error and normalize to JobError format
2. If attempts < MAX_RETRIES:
   - Increment attempt counter
   - BullMQ schedules retry with exponential backoff
3. If attempts >= MAX_RETRIES:
   - Mark job as FAILED
   - Store error details in job record
   - Send failure webhook (if configured)
4. Always cleanup temp directory
```

## Scaling Considerations

### Horizontal Scaling

- **API**: Stateless, scale behind load balancer
- **Workers**: Scale by increasing replicas in docker-compose
- **Redis**: Single instance sufficient for moderate load
- **PostgreSQL**: Connection pooling for high concurrency

### Resource Limits

| Component | Memory | CPU | Disk |
|-----------|--------|-----|------|
| API | 256MB | 0.5 | Minimal |
| Worker | 1GB+ | 2+ | Temp storage |
| FFmpeg | Varies | Intensive | Video output |

### Bottlenecks

1. **FFmpeg rendering**: CPU-bound, limit worker concurrency
2. **Image downloads**: Network-bound, timeout handling critical
3. **S3 uploads**: Network-bound, retry with backoff
