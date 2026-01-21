import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { JobStatus, JobError, Timeline } from '@video-render/types';

/**
 * Repository for job database operations
 */
@Injectable()
export class JobsRepository {
  private readonly logger = new Logger(JobsRepository.name);

  constructor(
    @InjectRepository(Job)
    private readonly repository: Repository<Job>,
  ) {}

  /**
   * Create a new job
   */
  async create(timeline: Timeline, callbackUrl?: string): Promise<Job> {
    const job = this.repository.create({
      timeline,
      callbackUrl,
      status: JobStatus.QUEUED,
      attempts: 0,
    });

    const saved = await this.repository.save(job);
    this.logger.log(`Created job: ${saved.id}`);
    return saved;
  }

  /**
   * Find a job by ID
   */
  async findById(id: string): Promise<Job | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Update job status
   */
  async updateStatus(id: string, status: JobStatus): Promise<void> {
    await this.repository.update(id, {
      status,
      ...(status === JobStatus.COMPLETED || status === JobStatus.FAILED
        ? { completedAt: new Date() }
        : {}),
    });
    this.logger.log(`Updated job ${id} status to ${status}`);
  }

  /**
   * Mark job as processing
   */
  async markProcessing(id: string): Promise<void> {
    await this.repository.update(id, {
      status: JobStatus.PROCESSING,
    });
    this.logger.log(`Job ${id} is now processing`);
  }

  /**
   * Mark job as completed with output URL
   */
  async markCompleted(id: string, outputUrl: string): Promise<void> {
    await this.repository.update(id, {
      status: JobStatus.COMPLETED,
      outputUrl,
      completedAt: new Date(),
    });
    this.logger.log(`Job ${id} completed with output: ${outputUrl}`);
  }

  /**
   * Mark job as failed with error details
   */
  async markFailed(id: string, error: JobError): Promise<void> {
    await this.repository.update(id, {
      status: JobStatus.FAILED,
      error: error as any, // TypeORM jsonb type workaround
      completedAt: new Date(),
    });
    this.logger.error(`Job ${id} failed: ${error.message}`);
  }

  /**
   * Increment attempt count
   */
  async incrementAttempts(id: string): Promise<void> {
    await this.repository.increment({ id }, 'attempts', 1);
  }

  /**
   * Find jobs by status
   */
  async findByStatus(status: JobStatus, limit = 10): Promise<Job[]> {
    return this.repository.find({
      where: { status },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * Find stale processing jobs (for recovery)
   */
  async findStaleProcessingJobs(thresholdMinutes: number): Promise<Job[]> {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    
    return this.repository
      .createQueryBuilder('job')
      .where('job.status = :status', { status: JobStatus.PROCESSING })
      .andWhere('job.updatedAt < :threshold', { threshold })
      .getMany();
  }
}
