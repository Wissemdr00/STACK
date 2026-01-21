import {
  IsNotEmpty,
  IsUrl,
  IsOptional,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TimelineClipSchema,
  TIMELINE_CONSTRAINTS,
} from '@video-render/schemas';

/**
 * Timeline DTO for job creation
 */
export class TimelineDto {
  @IsArray({ message: 'Clips must be an array' })
  @ArrayMinSize(1, { message: 'At least one clip is required' })
  @ArrayMaxSize(TIMELINE_CONSTRAINTS.MAX_CLIPS, {
    message: `Maximum ${TIMELINE_CONSTRAINTS.MAX_CLIPS} clips allowed`,
  })
  @ValidateNested({ each: true })
  @Type(() => TimelineClipSchema)
  clips!: TimelineClipSchema[];
}

/**
 * DTO for creating a new render job
 */
export class CreateJobDto {
  @IsNotEmpty({ message: 'Timeline is required' })
  @ValidateNested()
  @Type(() => TimelineDto)
  timeline!: TimelineDto;

  @IsOptional()
  @IsUrl({}, { message: 'Callback URL must be a valid URL' })
  callbackUrl?: string;
}
