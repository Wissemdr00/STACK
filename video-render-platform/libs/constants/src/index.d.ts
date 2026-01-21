export declare const QUEUE_NAMES: {
    readonly RENDER: "render-queue";
};
export declare const JOB_CONFIG: {
    readonly MAX_RETRIES: 3;
    readonly INITIAL_BACKOFF_MS: 1000;
    readonly BACKOFF_MULTIPLIER: 2;
    readonly JOB_TIMEOUT_MS: 300000;
    readonly STALLED_INTERVAL_MS: 30000;
    readonly MAX_STALLED_COUNT: 2;
};
export declare const FFMPEG_CONFIG: {
    readonly VIDEO_CODEC: "libx264";
    readonly AUDIO_CODEC: "aac";
    readonly VIDEO_BITRATE: "2M";
    readonly FRAME_RATE: 30;
    readonly WIDTH: 1920;
    readonly HEIGHT: 1080;
    readonly PIXEL_FORMAT: "yuv420p";
    readonly PRESET: "medium";
    readonly CRF: 23;
};
export declare const STORAGE_CONFIG: {
    readonly OUTPUT_BUCKET: "video-outputs";
    readonly OUTPUT_PREFIX: "outputs/";
    readonly SIGNED_URL_EXPIRY: 3600;
    readonly CONTENT_TYPE: "video/mp4";
};
export declare const ERROR_CODES: {
    readonly INVALID_TIMELINE: "INVALID_TIMELINE";
    readonly INVALID_CLIP: "INVALID_CLIP";
    readonly TIMELINE_TOO_LONG: "TIMELINE_TOO_LONG";
    readonly TOO_MANY_CLIPS: "TOO_MANY_CLIPS";
    readonly FFMPEG_ERROR: "FFMPEG_ERROR";
    readonly FFMPEG_TIMEOUT: "FFMPEG_TIMEOUT";
    readonly IMAGE_DOWNLOAD_FAILED: "IMAGE_DOWNLOAD_FAILED";
    readonly STORAGE_UPLOAD_FAILED: "STORAGE_UPLOAD_FAILED";
    readonly JOB_NOT_FOUND: "JOB_NOT_FOUND";
    readonly QUEUE_ERROR: "QUEUE_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly UNKNOWN_ERROR: "UNKNOWN_ERROR";
};
export declare const TEMP_CONFIG: {
    readonly BASE_DIR: "/tmp/video-render";
    readonly JOB_DIR_PREFIX: "job-";
};
