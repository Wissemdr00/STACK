import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job as BullJob } from 'bullmq';
import axios from 'axios';
import { RenderJobPayload, JobStatus, JobError } from '@video-render/types';
import { QUEUE_NAMES, ERROR_CODES, JOB_CONFIG } from '@video-render/constants';
import { TimelineCompiler } from '../rendering/timeline.compiler';
import { FFmpegRunner } from '../rendering/ffmpeg.runner';
import { S3Service } from '../storage/s3.service';
import { Job } from '../entities/job.entity';

@Processor(QUEUE_NAMES.RENDER, {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
})
export class RenderProcessor extends WorkerHost {
  private readonly logger = new Logger(RenderProcessor.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    private readonly timelineCompiler: TimelineCompiler,
    private readonly ffmpegRunner: FFmpegRunner,
    private readonly s3Service: S3Service,
  ) {
    super();
  }

  /**
   * Process a render job
   */
  async process(bullJob: BullJob<RenderJobPayload>): Promise<void> {
    const { jobId, timeline, callbackUrl } = bullJob.data;
    let workDir: string | null = null;

    this.logger.log(`Processing job ${jobId} (attempt ${bullJob.attemptsMade + 1})`);

    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, JobStatus.PROCESSING);

      // Compile timeline to FFmpeg command
      this.logger.log(`Compiling timeline for job ${jobId}`);
      const compilation = await this.timelineCompiler.compile(jobId, timeline);
      workDir = compilation.workDir;

      // Run FFmpeg
      this.logger.log(`Running FFmpeg for job ${jobId}`);
      const result = await this.ffmpegRunner.run(
        compilation.command,
        JOB_CONFIG.JOB_TIMEOUT_MS,
      );

      if (!result.success) {
        throw new RenderError(ERROR_CODES.FFMPEG_ERROR, result.error || 'FFmpeg failed');
      }

      // Upload to S3
      this.logger.log(`Uploading output for job ${jobId}`);
      const { url } = await this.s3Service.uploadVideo(jobId, result.outputPath);

      // Mark job as completed
      await this.markJobCompleted(jobId, url);

      // Send webhook callback if provided
      if (callbackUrl) {
        await this.sendCallback(callbackUrl, {
          jobId,
          status: 'completed',
          outputUrl: url,
        });
      }

      this.logger.log(`Job ${jobId} completed successfully`);
    } catch (error) {
      await this.handleJobError(jobId, bullJob, error, callbackUrl);
      throw error; // Re-throw to trigger BullMQ retry
    } finally {
      // Cleanup work directory
      if (workDir) {
        await this.timelineCompiler.cleanup(workDir);
      }
    }
  }

  /**
   * Handle job error and update database
   */
  private async handleJobError(
    jobId: string,
    bullJob: BullJob<RenderJobPayload>,
    error: unknown,
    callbackUrl?: string,
  ): Promise<void> {
    const isLastAttempt = bullJob.attemptsMade >= JOB_CONFIG.MAX_RETRIES - 1;
    const jobError = this.normalizeError(error);

    this.logger.error(
      `Job ${jobId} failed (attempt ${bullJob.attemptsMade + 1}/${JOB_CONFIG.MAX_RETRIES}): ${jobError.message}`,
    );

    // Only mark as failed on final attempt
    if (isLastAttempt) {
      await this.markJobFailed(jobId, jobError);

      // Send failure webhook
      if (callbackUrl) {
        await this.sendCallback(callbackUrl, {
          jobId,
          status: 'failed',
          error: jobError,
        });
      }
    } else {
      // Update attempt count
      await this.jobRepository.increment({ id: jobId }, 'attempts', 1);
    }
  }

  /**
   * Normalize error to JobError format
   */
  private normalizeError(error: unknown): JobError {
    if (error instanceof RenderError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
      };
    }

    if (axios.isAxiosError(error)) {
      return {
        code: ERROR_CODES.IMAGE_DOWNLOAD_FAILED,
        message: `Failed to download image: ${error.message}`,
        details: { url: error.config?.url },
      };
    }

    if (error instanceof Error) {
      return {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: 'An unknown error occurred',
    };
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(id: string, status: JobStatus): Promise<void> {
    await this.jobRepository.update(id, { status });
  }

  /**
   * Mark job as completed
   */
  private async markJobCompleted(id: string, outputUrl: string): Promise<void> {
    await this.jobRepository.update(id, {
      status: JobStatus.COMPLETED,
      outputUrl,
      completedAt: new Date(),
    });
  }

  /**
   * Mark job as failed
   */
  private async markJobFailed(id: string, error: JobError): Promise<void> {
    await this.jobRepository.update(id, {
      status: JobStatus.FAILED,
      error: error as any, // TypeORM jsonb type workaround
      completedAt: new Date(),
    });
  }

  /**
   * Send webhook callback
   */
  private async sendCallback(
    url: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await axios.post(url, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VideoRenderPlatform/1.0',
        },
      });
      this.logger.log(`Webhook sent to ${url}`);
    } catch (error) {
      this.logger.warn(`Failed to send webhook to ${url}: ${error}`);
      // Don't throw - webhook failure shouldn't fail the job
    }
  }

  /**
   * Worker event: Job completed
   */
  @OnWorkerEvent('completed')
  onCompleted(job: BullJob<RenderJobPayload>): void {
    this.logger.log(`Job ${job.data.jobId} completed`);
  }

  /**
   * Worker event: Job failed
   */
  @OnWorkerEvent('failed')
  onFailed(job: BullJob<RenderJobPayload>, error: Error): void {
    this.logger.error(`Job ${job.data.jobId} failed: ${error.message}`);
  }

  /**
   * Worker event: Job stalled
   */
  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`Job ${jobId} stalled`);
  }
}

/**
 * Custom error class for render failures
 */
class RenderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RenderError';
  }
}
