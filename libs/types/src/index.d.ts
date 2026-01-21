export declare enum JobStatus {
    QUEUED = "queued",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export interface JobError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
}
export interface JobResult {
    outputUrl: string;
    duration: number;
    fileSize: number;
    renderedAt: Date;
}
export interface RenderJobPayload {
    jobId: string;
    timeline: Timeline;
    callbackUrl?: string;
}
export interface TimelineClip {
    image: string;
    text: string;
    duration: number;
}
export interface Timeline {
    clips: TimelineClip[];
}
export interface IJob {
    id: string;
    status: JobStatus;
    timeline: Timeline;
    callbackUrl?: string;
    outputUrl?: string;
    error?: JobError;
    attempts: number;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}
export interface CreateJobRequest {
    timeline: Timeline;
    callbackUrl?: string;
}
export interface CreateJobResponse {
    jobId: string;
}
export interface JobStatusResponse {
    id: string;
    status: JobStatus;
    outputUrl?: string;
    error?: JobError;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}
