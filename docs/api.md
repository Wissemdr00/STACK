# API Documentation

## Base URL

```
http://localhost:3000
```

## Endpoints

### Submit Render Job

Creates a new video rendering job.

```http
POST /jobs
```

#### Request Headers

| Header | Required | Value |
|--------|----------|-------|
| `Content-Type` | Yes | `application/json` |

#### Request Body

```json
{
  "timeline": {
    "clips": [
      {
        "image": "string (URL)",
        "text": "string (max 200 chars)",
        "duration": "number (1-30 seconds)"
      }
    ]
  },
  "callbackUrl": "string (optional, valid URL)"
}
```

#### Timeline Constraints

| Constraint | Value |
|------------|-------|
| Minimum clips | 1 |
| Maximum clips | 10 |
| Min clip duration | 1 second |
| Max clip duration | 30 seconds |
| Max total duration | 120 seconds |
| Max text length | 200 characters |

#### Response

**202 Accepted**

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Error Responses

**400 Bad Request** - Invalid timeline

```json
{
  "statusCode": 400,
  "message": "At least one clip is required",
  "error": "Bad Request",
  "code": "INVALID_TIMELINE",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/jobs"
}
```

**400 Bad Request** - Too many clips

```json
{
  "statusCode": 400,
  "message": "Too many clips. Maximum 10 allowed",
  "error": "Bad Request",
  "code": "TOO_MANY_CLIPS",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/jobs"
}
```

**400 Bad Request** - Duration exceeded

```json
{
  "statusCode": 400,
  "message": "Total duration exceeds 120 seconds",
  "error": "Bad Request",
  "code": "TIMELINE_TOO_LONG",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/jobs"
}
```

---

### Get Job Status

Retrieves the current status of a render job.

```http
GET /jobs/:id
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Job identifier |

#### Response

**200 OK** - Job found

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "outputUrl": "https://minio:9000/video-outputs/outputs/550e8400-e29b-41d4-a716-446655440000.mp4?X-Amz-Algorithm=...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:45.000Z",
  "completedAt": "2024-01-15T10:30:45.000Z"
}
```

**200 OK** - Job failed

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": {
    "code": "IMAGE_DOWNLOAD_FAILED",
    "message": "Failed to download image: timeout of 30000ms exceeded",
    "details": {
      "url": "https://example.com/broken-image.jpg"
    }
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:31:30.000Z",
  "completedAt": "2024-01-15T10:31:30.000Z"
}
```

#### Error Responses

**400 Bad Request** - Invalid UUID

```json
{
  "statusCode": 400,
  "message": "Validation failed (uuid is expected)",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/jobs/not-a-uuid"
}
```

**404 Not Found** - Job not found

```json
{
  "statusCode": 404,
  "message": "Job with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found",
  "code": "JOB_NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/jobs/550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Job Status Values

| Status | Description | Transitions To |
|--------|-------------|----------------|
| `queued` | Job is waiting in the queue | `processing` |
| `processing` | Worker is actively rendering | `completed`, `failed` |
| `completed` | Video is ready for download | (terminal) |
| `failed` | Job failed after all retries | (terminal) |

---

## Webhook Callbacks

If a `callbackUrl` is provided, the system will POST to that URL when the job completes or fails.

### Completion Callback

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "outputUrl": "https://minio:9000/video-outputs/..."
}
```

### Failure Callback

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": {
    "code": "FFMPEG_ERROR",
    "message": "FFmpeg exited with code 1"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TIMELINE` | Timeline structure is invalid |
| `INVALID_CLIP` | Individual clip data is invalid |
| `TIMELINE_TOO_LONG` | Total duration exceeds limit |
| `TOO_MANY_CLIPS` | Number of clips exceeds limit |
| `FFMPEG_ERROR` | FFmpeg rendering failed |
| `FFMPEG_TIMEOUT` | FFmpeg exceeded time limit |
| `IMAGE_DOWNLOAD_FAILED` | Could not download image |
| `STORAGE_UPLOAD_FAILED` | Could not upload to S3 |
| `JOB_NOT_FOUND` | Job ID does not exist |
| `UNKNOWN_ERROR` | Unexpected error occurred |

---

## Example Usage

### cURL

```bash
# Submit job
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "timeline": {
      "clips": [
        {"image": "https://picsum.photos/1920/1080", "text": "Hello World", "duration": 3},
        {"image": "https://picsum.photos/1920/1080?random=2", "text": "Second Scene", "duration": 5}
      ]
    }
  }'

# Check status
curl http://localhost:3000/jobs/550e8400-e29b-41d4-a716-446655440000
```

### JavaScript/TypeScript

```typescript
// Submit job
const response = await fetch('http://localhost:3000/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    timeline: {
      clips: [
        { image: 'https://picsum.photos/1920/1080', text: 'Hello', duration: 3 }
      ]
    },
    callbackUrl: 'https://my-app.com/webhook'
  })
});

const { jobId } = await response.json();

// Poll for status
const pollStatus = async (id: string) => {
  const res = await fetch(`http://localhost:3000/jobs/${id}`);
  const job = await res.json();
  
  if (job.status === 'completed') {
    console.log('Video ready:', job.outputUrl);
  } else if (job.status === 'failed') {
    console.error('Job failed:', job.error);
  } else {
    setTimeout(() => pollStatus(id), 2000);
  }
};

pollStatus(jobId);
```
