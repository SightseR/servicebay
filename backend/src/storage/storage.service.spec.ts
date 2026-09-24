import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { StorageService } from './storage.service';

const cfg = (v: Record<string, string | undefined>) => ({ get: (k: string) => v[k] }) as unknown as ConfigService;

describe('StorageService', () => {
  it('defaults to the local driver and stores under UPLOADS_DIR with a /uploads public path', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sb-st-'));
    const svc = new StorageService(cfg({ UPLOADS_DIR: dir }));
    expect(svc.driverName).toBe('local');
    const res = await svc.put('company/x.png', Buffer.from('abc'), 'image/png');
    expect(res.publicPath).toBe('/uploads/company/x.png');
    expect(await fs.readFile(path.join(dir, 'company/x.png'), 'utf8')).toBe('abc');
    await svc.remove('/uploads/company/x.png');
    await expect(fs.access(path.join(dir, 'company/x.png'))).rejects.toBeTruthy();
    await svc.remove('/etc/passwd'); // ignored, no throw
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('gcs driver requires a bucket name', () => {
    expect(() => new StorageService(cfg({ STORAGE_DRIVER: 'gcs' }))).toThrow('GCS_BUCKET');
  });
});
