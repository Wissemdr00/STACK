import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Timeline, TimelineClip } from '@video-render/types';
import { FFMPEG_CONFIG, TEMP_CONFIG } from '@video-render/constants';
import { FFmpegCommand } from './ffmpeg.runner';

export interface CompilationResult {
  command: FFmpegCommand;
  workDir: string;
  clipFiles: string[];
}

/**
 * Timeline Compiler - Converts timeline JSON to FFmpeg commands
 * 
 * This is a pure transformation layer that:
 * 1. Downloads images to temp directory
 * 2. Generates FFmpeg filter complex for text overlays
 * 3. Builds the concatenation command
 */
@Injectable()
export class TimelineCompiler {
  private readonly logger = new Logger(TimelineCompiler.name);

  /**
   * Compile a timeline into an FFmpeg command
   */
  async compile(jobId: string, timeline: Timeline): Promise<CompilationResult> {
    // Create work directory
    const workDir = path.join(TEMP_CONFIG.BASE_DIR, `${TEMP_CONFIG.JOB_DIR_PREFIX}${jobId}`);
    await this.ensureDirectory(workDir);

    // Download all images
    const clipFiles: string[] = [];
    for (let i = 0; i < timeline.clips.length; i++) {
      const clip = timeline.clips[i];
      const imagePath = await this.downloadImage(clip.image, workDir, i);
      clipFiles.push(imagePath);
    }

    // Generate FFmpeg command
    const outputPath = path.join(workDir, 'output.mp4');
    const command = this.buildFFmpegCommand(timeline, clipFiles, outputPath);

    return { command, workDir, clipFiles };
  }

  /**
   * Build FFmpeg command for the timeline
   */
  private buildFFmpegCommand(
    timeline: Timeline,
    clipFiles: string[],
    outputPath: string,
  ): FFmpegCommand {
    const args: string[] = [];
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    // Add input files
    for (let i = 0; i < clipFiles.length; i++) {
      args.push('-loop', '1', '-t', String(timeline.clips[i].duration));
      args.push('-i', clipFiles[i]);
    }

    // Build filter complex for each clip
    for (let i = 0; i < timeline.clips.length; i++) {
      const clip = timeline.clips[i];
      const escapedText = this.escapeFFmpegText(clip.text);
      
      // Scale to target resolution and add text overlay
      filterParts.push(
        `[${i}:v]scale=${FFMPEG_CONFIG.WIDTH}:${FFMPEG_CONFIG.HEIGHT}:force_original_aspect_ratio=decrease,` +
        `pad=${FFMPEG_CONFIG.WIDTH}:${FFMPEG_CONFIG.HEIGHT}:(ow-iw)/2:(oh-ih)/2,` +
        `drawtext=text='${escapedText}':fontsize=64:fontcolor=white:` +
        `borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-th-100,` +
        `setpts=PTS-STARTPTS[v${i}]`
      );
      
      concatInputs.push(`[v${i}]`);
    }

    // Add concatenation filter
    filterParts.push(
      `${concatInputs.join('')}concat=n=${timeline.clips.length}:v=1:a=0[outv]`
    );

    // Build full filter complex
    args.push('-filter_complex', filterParts.join(';'));
    
    // Map output
    args.push('-map', '[outv]');
    
    // Output settings
    args.push(
      '-c:v', FFMPEG_CONFIG.VIDEO_CODEC,
      '-preset', FFMPEG_CONFIG.PRESET,
      '-crf', String(FFMPEG_CONFIG.CRF),
      '-pix_fmt', FFMPEG_CONFIG.PIXEL_FORMAT,
      '-r', String(FFMPEG_CONFIG.FRAME_RATE),
      '-movflags', '+faststart',
      '-y', // Overwrite output
      outputPath,
    );

    return { args, outputPath };
  }

  /**
   * Download an image to the work directory
   */
  private async downloadImage(
    url: string,
    workDir: string,
    index: number,
  ): Promise<string> {
    const extension = this.getImageExtension(url);
    const filePath = path.join(workDir, `clip_${index}${extension}`);

    this.logger.log(`Downloading image ${index}: ${url}`);

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'VideoRenderPlatform/1.0',
      },
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    this.logger.log(`Downloaded image ${index} to ${filePath}`);
    return filePath;
  }

  /**
   * Get image extension from URL
   */
  private getImageExtension(url: string): string {
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath).toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
      return ext;
    }
    
    return '.jpg'; // Default extension
  }

  /**
   * Escape text for FFmpeg drawtext filter
   */
  private escapeFFmpegText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\\''")
      .replace(/:/g, '\\:')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Clean up work directory
   */
  async cleanup(workDir: string): Promise<void> {
    try {
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
        this.logger.log(`Cleaned up work directory: ${workDir}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup ${workDir}: ${error}`);
    }
  }
}
