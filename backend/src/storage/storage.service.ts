import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Where uploaded files (company logo) live.
 *   STORAGE_DRIVER=local  → UPLOADS_DIR on disk, served by the API at /uploads/... (dev, Hetzner)
 *   STORAGE_DRIVER=gcs    → a public-read Cloud Storage bucket, referenced by absolute https URL (Cloud Run)
 * Callers get back a public URL/path to store on the profile; they never touch the driver.
 */
export interface StoredFile { publicPath: string }

export interface StorageDriver {
  put(key: string, buffer: Buffer, contentType: string): Promise<StoredFile>;
  remove(publicPath: string): Promise<void>;
}

class LocalDriver implements StorageDriver {
  constructor(private readonly root: string) {}
  async put(key: string, buffer: Buffer, _contentType: string): Promise<StoredFile> {
    const abs = path.join(this.root, key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buffer);
    return { publicPath: `/uploads/${key}` };
  }
  async remove(publicPath: string): Promise<void> {
    if (!publicPath.startsWith('/uploads/')) return;
    const abs = path.resolve(this.root, publicPath.slice('/uploads/'.length));
    if (!abs.startsWith(path.resolve(this.root))) return; // never outside the uploads dir
    await fs.unlink(abs).catch(() => undefined);
  }
}

class GcsDriver implements StorageDriver {
  private readonly bucket;
  constructor(bucketName: string) {
    // Lazy require so the local driver never loads the GCS SDK. Auth = Cloud Run's service account (ADC).
    const { Storage } = require('@google-cloud/storage') as typeof import('@google-cloud/storage');
    this.bucket = new Storage().bucket(bucketName);
  }
  async put(key: string, buffer: Buffer, contentType: string): Promise<StoredFile> {
    await this.bucket.file(key).save(buffer, { contentType, resumable: false, metadata: { cacheControl: 'public, max-age=86400' } });
    return { publicPath: `https://storage.googleapis.com/${this.bucket.name}/${key}` };
  }
  async remove(publicPath: string): Promise<void> {
    const prefix = `https://storage.googleapis.com/${this.bucket.name}/`;
    if (!publicPath.startsWith(prefix)) return;
    await this.bucket.file(publicPath.slice(prefix.length)).delete({ ignoreNotFound: true });
  }
}

@Injectable()
export class StorageService implements StorageDriver {
  private readonly log = new Logger(StorageService.name);
  private readonly driver: StorageDriver;
  readonly driverName: 'local' | 'gcs';

  constructor(config: ConfigService) {
    const driver = (config.get<string>('STORAGE_DRIVER') ?? 'local') as 'local' | 'gcs';
    this.driverName = driver;
    if (driver === 'gcs') {
      const bucket = config.get<string>('GCS_BUCKET');
      if (!bucket) throw new Error('STORAGE_DRIVER=gcs requires GCS_BUCKET');
      this.driver = new GcsDriver(bucket);
      this.log.log(`uploads → Cloud Storage bucket ${bucket}`);
    } else {
      this.driver = new LocalDriver(path.resolve(config.get<string>('UPLOADS_DIR') ?? 'uploads'));
    }
  }

  put(key: string, buffer: Buffer, contentType: string) { return this.driver.put(key, buffer, contentType); }
  remove(publicPath: string) { return this.driver.remove(publicPath); }
}
