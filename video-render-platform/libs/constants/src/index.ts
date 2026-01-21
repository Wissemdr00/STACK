/**
 * Queue names used throughout the system
 */
export const QUEUE_NAMES = {
  RENDER: 'render-queue',
} as const;

/**
 * Job processing configuration
 */
export const JOB_CONFIG = {
  /** Maximum number of retry attempts */
  MAX_RETRIES: 3,
  /** Initial backoff delay in milliseconds */
  INITIAL_BACKOFF_MS: 1000,
  /** Backoff multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2,
  /** Maximum job timeout in milliseconds (5 minutes) */
  JOB_TIMEOUT_MS: 300000,
  /** Stalled job check interval in milliseconds */
  STALLED_INTERVAL_MS: 30000,
  /** Maximum stalled count before job is considered failed */
  MAX_STALLED_COUNT: 2,
} as const;

/**
 * FFmpeg configuration
 */
export const FFMPEG_CONFIG = {
  /** Output video codec */
  VIDEO_CODEC: 'libx264',
  /** Output audio codec */
  AUDIO_CODEC: 'aac',
  /** Video bitrate */
  VIDEO_BITRATE: '2M',
  /** Frame rate */
  FRAME_RATE: 30,
  /** Output resolution width */
  WIDTH: 1920,
  /** Output resolution height */
  HEIGHT: 1080,
  /** Pixel format */
  PIXEL_FORMAT: 'yuv420p',
  /** Preset for encoding speed/quality tradeoff */
  PRESET: 'medium',
  /** CRF value for quality (lower = better, 23 is default) */
  CRF: 23,
} as const;

/**
 * Storage configuration
 */
export const STORAGE_CONFIG = {
  /** Bucket for output videos */
  OUTPUT_BUCKET: 'video-outputs',
  /** Prefix for output files */
  OUTPUT_PREFIX: 'outputs/',
  /** Signed URL expiration in seconds (1 hour) */
  SIGNED_URL_EXPIRY: 3600,
  /** Content type for output videos */
  CONTENT_TYPE: 'video/mp4',
} as const;

/**
 * Error codes for standardized error handling
 */
export const ERROR_CODES = {
  // Validation errors (4xx)
  INVALID_TIMELINE: 'INVALID_TIMELINE',
  INVALID_CLIP: 'INVALID_CLIP',
  TIMELINE_TOO_LONG: 'TIMELINE_TOO_LONG',
  TOO_MANY_CLIPS: 'TOO_MANY_CLIPS',
  
  // Processing errors (5xx)
  FFMPEG_ERROR: 'FFMPEG_ERROR',
  FFMPEG_TIMEOUT: 'FFMPEG_TIMEOUT',
  IMAGE_DOWNLOAD_FAILED: 'IMAGE_DOWNLOAD_FAILED',
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  
  // System errors
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  QUEUE_ERROR: 'QUEUE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Temp directory configuration
 */
export const TEMP_CONFIG = {
  /** Base temp directory */
  BASE_DIR: '/tmp/video-render',
  /** Prefix for job work directories */
  JOB_DIR_PREFIX: 'job-',
} as const;
