"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMP_CONFIG = exports.ERROR_CODES = exports.STORAGE_CONFIG = exports.FFMPEG_CONFIG = exports.JOB_CONFIG = exports.QUEUE_NAMES = void 0;
exports.QUEUE_NAMES = {
    RENDER: 'render-queue',
};
exports.JOB_CONFIG = {
    MAX_RETRIES: 3,
    INITIAL_BACKOFF_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
    JOB_TIMEOUT_MS: 300000,
    STALLED_INTERVAL_MS: 30000,
    MAX_STALLED_COUNT: 2,
};
exports.FFMPEG_CONFIG = {
    VIDEO_CODEC: 'libx264',
    AUDIO_CODEC: 'aac',
    VIDEO_BITRATE: '2M',
    FRAME_RATE: 30,
    WIDTH: 1920,
    HEIGHT: 1080,
    PIXEL_FORMAT: 'yuv420p',
    PRESET: 'medium',
    CRF: 23,
};
exports.STORAGE_CONFIG = {
    OUTPUT_BUCKET: 'video-outputs',
    OUTPUT_PREFIX: 'outputs/',
    SIGNED_URL_EXPIRY: 3600,
    CONTENT_TYPE: 'video/mp4',
};
exports.ERROR_CODES = {
    INVALID_TIMELINE: 'INVALID_TIMELINE',
    INVALID_CLIP: 'INVALID_CLIP',
    TIMELINE_TOO_LONG: 'TIMELINE_TOO_LONG',
    TOO_MANY_CLIPS: 'TOO_MANY_CLIPS',
    FFMPEG_ERROR: 'FFMPEG_ERROR',
    FFMPEG_TIMEOUT: 'FFMPEG_TIMEOUT',
    IMAGE_DOWNLOAD_FAILED: 'IMAGE_DOWNLOAD_FAILED',
    STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
    JOB_NOT_FOUND: 'JOB_NOT_FOUND',
    QUEUE_ERROR: 'QUEUE_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};
exports.TEMP_CONFIG = {
    BASE_DIR: '/tmp/video-render',
    JOB_DIR_PREFIX: 'job-',
};
//# sourceMappingURL=index.js.map