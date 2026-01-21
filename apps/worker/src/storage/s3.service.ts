import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { STORAGE_CONFIG } from '@video-render/constants';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = configService.get<string>(
      'S3_BUCKET',
      STORAGE_CONFIG.OUTPUT_BUCKET,
    );

    this.client = new S3Client({
      endpoint: configService.get<string>('S3_ENDPOINT'),
      region: configService.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: configService.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: configService.get<string>(
          'S3_SECRET_KEY',
          'minioadmin',
        ),
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.ensureBucketExists();
  }

  /**
   * Ensure the output bucket exists
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket ${this.bucket} exists`);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'NotFound') {
        this.logger.log(`Creating bucket ${this.bucket}`);
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      }
    }
  }

  /**
   * Upload a video file to S3
   */
  async uploadVideo(
    jobId: string,
    filePath: string,
  ): Promise<{ key: string; url: string }> {
    const key = `${STORAGE_CONFIG.OUTPUT_PREFIX}${jobId}.mp4`;
    
    const fileStream = fs.createReadStream(filePath);
    const fileStats = fs.statSync(filePath);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
        ContentType: STORAGE_CONFIG.CONTENT_TYPE,
        ContentLength: fileStats.size,
      }),
    );

    const signedUrl = await this.getSignedUrl(key);

    this.logger.log(`Uploaded video for job ${jobId}: ${key}`);

    return { key, url: signedUrl };
  }

  /**
   * Generate a signed URL for the output file
   */
  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: STORAGE_CONFIG.SIGNED_URL_EXPIRY,
    });
  }

  /**
   * Get the public URL for an object
   * (Used when bucket is publicly accessible)
   */
  getPublicUrl(key: string): string {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    return `${endpoint}/${this.bucket}/${key}`;
  }
}
