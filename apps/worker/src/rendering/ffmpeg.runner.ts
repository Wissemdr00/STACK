import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface FFmpegCommand {
  args: string[];
  outputPath: string;
}

export interface FFmpegResult {
  success: boolean;
  outputPath: string;
  duration?: number;
  error?: string;
}

@Injectable()
export class FFmpegRunner {
  private readonly logger = new Logger(FFmpegRunner.name);

  /**
   * Execute FFmpeg command and return result
   */
  async run(
    command: FFmpegCommand,
    timeoutMs: number = 300000,
  ): Promise<FFmpegResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let ffmpegProcess: ChildProcess | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      let stderr = '';
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (ffmpegProcess && !ffmpegProcess.killed) {
          ffmpegProcess.kill('SIGKILL');
        }
      };

      const finish = (result: FFmpegResult) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(result);
        }
      };

      try {
        this.logger.log(`Executing FFmpeg: ffmpeg ${command.args.join(' ')}`);

        ffmpegProcess = spawn('ffmpeg', command.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // Set timeout
        timeoutId = setTimeout(() => {
          this.logger.error(`FFmpeg timeout after ${timeoutMs}ms`);
          finish({
            success: false,
            outputPath: command.outputPath,
            error: `FFmpeg timeout after ${timeoutMs}ms`,
          });
        }, timeoutMs);

        // Collect stderr (FFmpeg outputs progress here)
        ffmpegProcess.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        ffmpegProcess.on('close', (code) => {
          const duration = Date.now() - startTime;

          if (code === 0) {
            // Verify output file exists
            if (fs.existsSync(command.outputPath)) {
              this.logger.log(
                `FFmpeg completed in ${duration}ms: ${command.outputPath}`,
              );
              finish({
                success: true,
                outputPath: command.outputPath,
                duration,
              });
            } else {
              this.logger.error('FFmpeg completed but output file not found');
              finish({
                success: false,
                outputPath: command.outputPath,
                error: 'Output file not found after FFmpeg completed',
              });
            }
          } else {
            this.logger.error(`FFmpeg failed with code ${code}: ${stderr}`);
            finish({
              success: false,
              outputPath: command.outputPath,
              error: `FFmpeg exited with code ${code}: ${this.extractErrorMessage(stderr)}`,
            });
          }
        });

        ffmpegProcess.on('error', (error) => {
          this.logger.error(`FFmpeg process error: ${error.message}`);
          finish({
            success: false,
            outputPath: command.outputPath,
            error: `FFmpeg process error: ${error.message}`,
          });
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to spawn FFmpeg: ${message}`);
        finish({
          success: false,
          outputPath: command.outputPath,
          error: `Failed to spawn FFmpeg: ${message}`,
        });
      }
    });
  }

  /**
   * Extract meaningful error message from FFmpeg stderr
   */
  private extractErrorMessage(stderr: string): string {
    // Look for common FFmpeg error patterns
    const errorPatterns = [
      /Error.*$/m,
      /Invalid.*$/m,
      /No such file or directory/m,
      /Permission denied/m,
    ];

    for (const pattern of errorPatterns) {
      const match = stderr.match(pattern);
      if (match) {
        return match[0];
      }
    }

    // Return last few lines if no specific pattern found
    const lines = stderr.trim().split('\n');
    return lines.slice(-3).join(' ');
  }

  /**
   * Get FFmpeg version for debugging
   */
  async getVersion(): Promise<string> {
    return new Promise((resolve) => {
      const process = spawn('ffmpeg', ['-version']);
      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', () => {
        const versionMatch = output.match(/ffmpeg version (\S+)/);
        resolve(versionMatch ? versionMatch[1] : 'unknown');
      });

      process.on('error', () => {
        resolve('not found');
      });
    });
  }
}
