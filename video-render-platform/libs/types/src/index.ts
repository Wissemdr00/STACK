/**
 * Job status enum representing all possible states in the job lifecycle
 */
export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Job error structure for storing failure details
 */
export interface JobError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * Job result containing output information
 */
export interface JobResult {
  outputUrl: string;
  duration: number;
  fileSize: number;
  renderedAt: Date;
}

/**
 * Render job payload sent to the queue
 */
export interface RenderJobPayload {
  jobId: string;
  timeline: Timeline;
  callbackUrl?: string;
}

/**
 * Timeline clip representing a single segment in the video
 */
export interface TimelineClip {
  /** URL to the source image */
  image: string;
  /** Text overlay to display on the clip */
  text: string;
  /** Duration in seconds for this clip */
  duration: number;
}

/**
 * Timeline structure for the video composition
 */
export interface Timeline {
  clips: TimelineClip[];
}

/**
 * Job entity interface
 */
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

/**
 * Job creation request
 */
export interface CreateJobRequest {
  timeline: Timeline;
  callbackUrl?: string;
}

/**
 * Job creation response
 */
export interface CreateJobResponse {
  jobId: string;
}

/**
 * Job status response
 */
export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  outputUrl?: string;
  error?: JobError;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
