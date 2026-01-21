import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobStatus, Timeline, JobError } from '@video-render/types';

/**
 * Job entity for worker (mirrors API entity)
 */
@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.QUEUED,
  })
  status!: JobStatus;

  @Column({ type: 'jsonb' })
  timeline!: Timeline;

  @Column({ type: 'varchar', nullable: true })
  callbackUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  outputUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  error?: JobError;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
