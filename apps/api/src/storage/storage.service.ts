import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const bucket = this.config.get<string>('S3_BUCKET');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('S3_SECRET_ACCESS_KEY');

    this.bucket = bucket ?? '';
    this.publicUrl = (this.config.get<string>('S3_PUBLIC_URL') ?? '').replace(/\/$/, '');

    if (endpoint && bucket && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        endpoint,
        region: this.config.get<string>('S3_REGION') ?? 'auto',
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle:
          (this.config.get<string>('S3_FORCE_PATH_STYLE') ?? 'true') === 'true',
      });
    } else {
      this.client = null;
      this.logger.warn('S3 storage not configured — file uploads are disabled.');
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  private ensure(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'ยังไม่ได้ตั้งค่าที่เก็บไฟล์ (S3) — ตั้งค่า S3_* ใน .env ก่อน',
      );
    }
    return this.client;
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.ensure().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getUrl(key: string): Promise<string> {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    return getSignedUrl(
      this.ensure(),
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 3600 },
    );
  }

  async delete(key: string): Promise<void> {
    await this.ensure().send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
