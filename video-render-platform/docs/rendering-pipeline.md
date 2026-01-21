# Rendering Pipeline

## Overview

The rendering pipeline transforms declarative JSON timeline specifications into MP4 video files using FFmpeg. This document describes the pipeline architecture, FFmpeg command generation, and optimization strategies.

## Pipeline Stages

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Timeline    │────▶│    Image      │────▶│    FFmpeg     │────▶│    S3         │
│   Compile     │     │   Download    │     │   Execute     │     │   Upload      │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
      JSON                HTTP                  Render              Object Store
```

### Stage 1: Timeline Compilation

**Input**: Timeline JSON
**Output**: FFmpeg command arguments

The `TimelineCompiler` service transforms the timeline into an executable FFmpeg command. This is a pure transformation with no side effects.

```typescript
interface Timeline {
  clips: {
    image: string;    // URL to source image
    text: string;     // Text overlay
    duration: number; // Seconds
  }[];
}
```

### Stage 2: Image Download

**Input**: Image URLs
**Output**: Local file paths

Images are downloaded to a temporary work directory (`/tmp/video-render/job-{uuid}/`).

- Concurrent downloads for performance
- 30-second timeout per image
- Extension detection from URL
- Fallback to `.jpg` if unknown

### Stage 3: FFmpeg Execution

**Input**: FFmpeg command
**Output**: Rendered MP4 file

The `FFmpegRunner` service executes FFmpeg with:
- Process isolation via spawn
- Timeout enforcement (default 5 minutes)
- stderr capture for error messages
- Exit code validation
- Output file verification

### Stage 4: S3 Upload

**Input**: Local MP4 file
**Output**: Signed URL

The `S3Service` uploads the rendered video:
- Streaming upload (no full file memory copy)
- Content-Type: `video/mp4`
- 1-hour signed URL for access

---

## FFmpeg Command Generation

### Filter Complex Architecture

For a 3-clip timeline, the filter complex looks like:

```
[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,
    pad=1920:1080:(ow-iw)/2:(oh-ih)/2,
    drawtext=text='First':fontsize=64:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-th-100,
    setpts=PTS-STARTPTS[v0];

[1:v]scale=1920:1080:force_original_aspect_ratio=decrease,
    pad=1920:1080:(ow-iw)/2:(oh-ih)/2,
    drawtext=text='Second':fontsize=64:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-th-100,
    setpts=PTS-STARTPTS[v1];

[2:v]scale=1920:1080:force_original_aspect_ratio=decrease,
    pad=1920:1080:(ow-iw)/2:(oh-ih)/2,
    drawtext=text='Third':fontsize=64:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-th-100,
    setpts=PTS-STARTPTS[v2];

[v0][v1][v2]concat=n=3:v=1:a=0[outv]
```

### Per-Clip Processing

Each clip goes through:

1. **scale**: Resize maintaining aspect ratio
2. **pad**: Add letterbox/pillarbox to fill 1920x1080
3. **drawtext**: Add centered text at bottom
4. **setpts**: Reset timestamps for concatenation

### Text Overlay Configuration

```
fontsize=64
fontcolor=white
borderw=3
bordercolor=black
x=(w-text_w)/2    # Horizontally centered
y=h-th-100        # 100px from bottom
```

### Output Encoding

```
-c:v libx264      # H.264 codec
-preset medium    # Balance speed/quality
-crf 23           # Quality (lower = better)
-pix_fmt yuv420p  # Compatibility format
-r 30             # 30 fps
-movflags +faststart  # Web streaming ready
```

---

## Example Command

For a 2-clip timeline:

```bash
ffmpeg \
  -loop 1 -t 3 -i /tmp/video-render/job-xxx/clip_0.jpg \
  -loop 1 -t 5 -i /tmp/video-render/job-xxx/clip_1.jpg \
  -filter_complex "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,drawtext=text='Hello':fontsize=64:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-th-100,setpts=PTS-STARTPTS[v0];[1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,drawtext=text='World':fontsize=64:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-th-100,setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0[outv]" \
  -map "[outv]" \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -pix_fmt yuv420p \
  -r 30 \
  -movflags +faststart \
  -y /tmp/video-render/job-xxx/output.mp4
```

---

## Text Escaping

Special characters in text must be escaped for the drawtext filter:

| Character | Escape |
|-----------|--------|
| `\` | `\\` |
| `'` | `'\\''` |
| `:` | `\\:` |
| `[` | `\\[` |
| `]` | `\\]` |

---

## Performance Considerations

### Memory Usage

- Images loaded one at a time during FFmpeg execution
- Output streamed directly to file
- No in-memory video buffering

### CPU Usage

- FFmpeg is CPU-intensive
- Limit worker concurrency based on available cores
- Consider `WORKER_CONCURRENCY=1` for resource-constrained environments

### Disk Usage

- Temp files cleaned up after each job
- Work directory: ~50-100MB per job typical
- Output size: Varies by duration and content

### Timeouts

| Operation | Timeout | Config |
|-----------|---------|--------|
| Image download | 30s | Hardcoded |
| FFmpeg render | 5min | `JOB_TIMEOUT_MS` |
| S3 upload | AWS SDK default | - |

---

## Determinism

The pipeline is designed to be deterministic:

- Same timeline JSON → Same output video
- No random elements in rendering
- Timestamps reset for consistent concatenation
- Fixed encoding parameters

This enables:
- Reliable retries
- Output caching (not implemented)
- Reproducible debugging
