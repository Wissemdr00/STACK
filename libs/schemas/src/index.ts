import {
  IsString,
  IsNumber,
  IsUrl,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNotEmpty,
  ArrayMinSize,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Schema for a single timeline clip
 */
export class TimelineClipSchema {
  @IsUrl({}, { message: 'Image must be a valid URL' })
  @IsNotEmpty({ message: 'Image URL is required' })
  image!: string;

  @IsString({ message: 'Text must be a string' })
  @MaxLength(200, { message: 'Text must not exceed 200 characters' })
  text!: string;

  @IsNumber({}, { message: 'Duration must be a number' })
  @Min(1, { message: 'Duration must be at least 1 second' })
  @Max(30, { message: 'Duration must not exceed 30 seconds per clip' })
  duration!: number;
}

/**
 * Schema for the complete timeline
 */
export class TimelineSchema {
  @IsArray({ message: 'Clips must be an array' })
  @ArrayMinSize(1, { message: 'At least one clip is required' })
  @ValidateNested({ each: true })
  @Type(() => TimelineClipSchema)
  clips!: TimelineClipSchema[];
}

/**
 * Validation constraints for timeline
 */
export const TIMELINE_CONSTRAINTS = {
  MAX_CLIPS: 10,
  MAX_TOTAL_DURATION: 120, // 2 minutes
  MAX_TEXT_LENGTH: 200,
  MIN_CLIP_DURATION: 1,
  MAX_CLIP_DURATION: 30,
} as const;

/**
 * Validate total timeline duration
 */
export function validateTimelineDuration(clips: TimelineClipSchema[]): boolean {
  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
  return totalDuration <= TIMELINE_CONSTRAINTS.MAX_TOTAL_DURATION;
}

/**
 * Validate number of clips
 */
export function validateClipCount(clips: TimelineClipSchema[]): boolean {
  return clips.length <= TIMELINE_CONSTRAINTS.MAX_CLIPS;
}
