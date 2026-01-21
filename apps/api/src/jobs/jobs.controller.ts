import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateJobResponse, JobStatusResponse } from '@video-render/types';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * Submit a new render job
   * 
   * POST /jobs
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createJob(@Body() dto: CreateJobDto): Promise<CreateJobResponse> {
    return this.jobsService.createJob(dto);
  }

  /**
   * Get job status by ID
   * 
   * GET /jobs/:id
   */
  @Get(':id')
  async getJobStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobStatusResponse> {
    return this.jobsService.getJobStatus(id);
  }
}
