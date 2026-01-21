import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JobsRepository } from './jobs.repository';
import { RenderQueueService } from '../queue/render.queue';
import { CreateJobDto } from './dto/create-job.dto';
import {
  CreateJobResponse,
  JobStatusResponse,
  RenderJobPayload,
} from '@video-render/types';
import {
  TIMELINE_CONSTRAINTS,
  validateTimelineDuration,
  validateClipCount,
} from '@video-render/schemas';
import { ERROR_CODES } from '@video-render/constants';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly jobsRepository: JobsRepository,
    private readonly renderQueue: RenderQueueService,
  ) {}

  /**
   * Create a new render job
   */
  async createJob(dto: CreateJobDto): Promise<CreateJobResponse> {
    // Validate timeline constraints
    this.validateTimeline(dto);

    // Create job record
    const job = await this.jobsRepository.create(
      dto.timeline,
      dto.callbackUrl,
    );

    // Enqueue for processing
    const payload: RenderJobPayload = {
      jobId: job.id,
      timeline: dto.timeline,
      callbackUrl: dto.callbackUrl,
    };

    await this.renderQueue.enqueueRenderJob(payload);

    this.logger.log(`Job created and enqueued: ${job.id}`);

    return { jobId: job.id };
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(id: string): Promise<JobStatusResponse> {
    const job = await this.jobsRepository.findById(id);

    if (!job) {
      throw new NotFoundException({
        message: `Job with ID ${id} not found`,
        code: ERROR_CODES.JOB_NOT_FOUND,
      });
    }

    return {
      id: job.id,
      status: job.status,
      outputUrl: job.outputUrl,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Validate timeline constraints
   */
  private validateTimeline(dto: CreateJobDto): void {
    const { clips } = dto.timeline;

    // Validate clip count
    if (!validateClipCount(clips)) {
      throw new BadRequestException({
        message: `Too many clips. Maximum ${TIMELINE_CONSTRAINTS.MAX_CLIPS} allowed`,
        code: ERROR_CODES.TOO_MANY_CLIPS,
      });
    }

    // Validate total duration
    if (!validateTimelineDuration(clips)) {
      throw new BadRequestException({
        message: `Total duration exceeds ${TIMELINE_CONSTRAINTS.MAX_TOTAL_DURATION} seconds`,
        code: ERROR_CODES.TIMELINE_TOO_LONG,
      });
    }
  }
}
