# Failure Handling Strategy

## Design Philosophy

The video rendering platform is designed with the assumption that failures are inevitable. Every component has explicit failure handling, and the system degrades gracefully rather than corrupting state.

### Key Principles

1. **Fail Fast on Invalid Input**: Reject bad requests at the API boundary
2. **Retry Transient Failures**: Network issues and temporary unavailability
3. **Fail Permanently on Unrecoverable Errors**: Don't waste resources on hopeless jobs
4. **Always Clean Up**: Temp files removed regardless of outcome
5. **Preserve Evidence**: Error details stored for debugging

---

## Failure Categories

### 1. Input Validation Failures (4xx)

**When**: Request received with invalid data

**Detection**: class-validator decorators in DTOs

**Response**: Immediate 400 Bad Request

**Examples**:
- Missing required fields
- Invalid URL format
- Duration out of range
- Too many clips

```json
{
  "statusCode": 400,
  "message": "Duration must be at least 1 second",
  "error": "Bad Request"
}
```

**No retry** - Client must fix input

---

### 2. Image Download Failures

**When**: Worker cannot fetch source images

**Detection**: Axios timeout or HTTP error

**Handling**:
```
Attempt 1 → Failure → Retry after 1s
Attempt 2 → Failure → Retry after 2s  
Attempt 3 → Failure → Mark job FAILED
```

**Error Stored**:
```json
{
  "code": "IMAGE_DOWNLOAD_FAILED",
  "message": "Failed to download image: timeout of 30000ms exceeded",
  "details": {
    "url": "https://example.com/image.jpg"
  }
}
```

**Retried** - Network issues often transient

---

### 3. FFmpeg Rendering Failures

**When**: FFmpeg process fails

**Detection**: Non-zero exit code or missing output file

**Handling**:
```
Attempt 1 → Exit code 1 → Retry after 1s
Attempt 2 → Exit code 1 → Retry after 2s
Attempt 3 → Exit code 1 → Mark job FAILED
```

**Error Stored**:
```json
{
  "code": "FFMPEG_ERROR",
  "message": "FFmpeg exited with code 1: Invalid data found when processing input"
}
```

**Retried** - Some FFmpeg errors are transient (memory pressure)

---

### 4. FFmpeg Timeout

**When**: Rendering exceeds time limit

**Detection**: BullMQ job timeout (default 5 minutes)

**Handling**:
1. Kill FFmpeg process
2. Cleanup temp directory
3. Retry with backoff (if attempts remaining)

**Error Stored**:
```json
{
  "code": "FFMPEG_TIMEOUT",
  "message": "FFmpeg timeout after 300000ms"
}
```

**Retried** - Timeout may be due to system load

---

### 5. S3 Upload Failures

**When**: Cannot upload rendered video

**Detection**: AWS SDK throws error

**Handling**:
1. Retry upload internally (SDK retry)
2. If still fails, job fails
3. Cleanup temp directory

**Error Stored**:
```json
{
  "code": "STORAGE_UPLOAD_FAILED",
  "message": "Failed to upload video: NetworkingError"
}
```

**Retried** - Network issues often transient

---

### 6. Worker Crashes / Restarts

**When**: Worker process terminates unexpectedly

**Detection**: BullMQ stalled job detection

**Handling**:
1. BullMQ marks job as stalled after `stalledInterval` (30s)
2. If stalled count < `maxStalledCount` (2), job is retried
3. Otherwise, job is moved to failed

**Recovery**:
- Worker restarts automatically (Docker restart policy)
- Temp files may be orphaned (cleaned by cron in production)

---

## State Transitions

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
┌─────────┐    ┌────────────┐    ┌───────────┐              ┌────┴────┐
│ QUEUED  │───▶│ PROCESSING │───▶│ COMPLETED │              │ FAILED  │
└─────────┘    └────────────┘    └───────────┘              └─────────┘
                    │                                             ▲
                    │         ┌─────────────────────────────────┐ │
                    └────────▶│ Retry (if attempts < MAX)       │─┘
                              │ Back to PROCESSING on next try  │
                              └─────────────────────────────────┘
```

### Transition Rules

| From | To | Trigger |
|------|----|---------|
| QUEUED | PROCESSING | Worker dequeues job |
| PROCESSING | COMPLETED | Render + upload success |
| PROCESSING | FAILED | Max retries exceeded |
| PROCESSING | PROCESSING | Retry after transient failure |

---

## Retry Configuration

```typescript
const JOB_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000,
  BACKOFF_MULTIPLIER: 2, // Exponential
  JOB_TIMEOUT_MS: 300000, // 5 minutes
  STALLED_INTERVAL_MS: 30000,
  MAX_STALLED_COUNT: 2,
};
```

### Backoff Schedule

| Attempt | Delay Before Retry |
|---------|-------------------|
| 1 | 1 second |
| 2 | 2 seconds |
| 3 | 4 seconds |
| (Final failure) | - |

---

## Error Response Contract

All errors stored in jobs follow this structure:

```typescript
interface JobError {
  code: string;        // Machine-readable error code
  message: string;     // Human-readable description
  details?: object;    // Additional context (optional)
  stack?: string;      // Stack trace (development only)
}
```

---

## Cleanup Guarantees

### Normal Completion
1. Temp directory deleted after S3 upload
2. BullMQ job moved to completed (with TTL)

### Failure
1. Temp directory deleted in finally block
2. Error details persisted to PostgreSQL
3. BullMQ job moved to failed

### Worker Crash
1. Temp files orphaned (manual cleanup needed)
2. Job retried by another worker
3. Consider cron job for `/tmp/video-render/job-*` cleanup

---

## Monitoring Recommendations

### Alerts to Configure

| Metric | Threshold | Action |
|--------|-----------|--------|
| Failed job rate | > 5% | Investigate error logs |
| Queue depth | > 100 | Scale workers |
| P95 render time | > 4 min | Investigate slow jobs |
| Worker restarts | > 3/hour | Check resource limits |

### Logging

- All errors logged with job ID
- FFmpeg stderr captured on failure
- State transitions logged for audit trail

---

## Testing Failure Scenarios

### Test Invalid Input
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"timeline": {"clips": []}}'
# Expected: 400 Bad Request
```

### Test Image Download Failure
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "timeline": {
      "clips": [
        {"image": "https://invalid-domain-xyz.com/image.jpg", "text": "Test", "duration": 3}
      ]
    }
  }'
# Expected: Job fails after retries
```

### Test Timeout
Submit job with many high-resolution clips and monitor for timeout behavior.
