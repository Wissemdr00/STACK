import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_CONFIG } from '@video-render/constants';
import { RenderJobPayload } from '@video-render/types';

@Injectable()
export class RenderQueueService {
  private readonly logger = new Logger(RenderQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RENDER)
    private readonly renderQueue: Queue<RenderJobPayload>,
  ) {}

  /**
   * Enqueue a render job for processing
   */
  async enqueueRenderJob(payload: RenderJobPayload): Promise<string> {
    const job = await this.renderQueue.add('render', payload, {
      jobId: payload.jobId,
      attempts: JOB_CONFIG.MAX_RETRIES,
      backoff: {
        type: 'exponential',
        delay: JOB_CONFIG.INITIAL_BACKOFF_MS,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 100,
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
        count: 1000,
      },
    });

    this.logger.log(`Enqueued render job: ${job.id}`);
    return job.id as string;
  }

  /**
   * Get the current queue status
   */
  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.renderQueue.getWaitingCount(),
      this.renderQueue.getActiveCount(),
      this.renderQueue.getCompletedCount(),
      this.renderQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
