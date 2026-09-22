import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/company.dto';
import { detectImage, EXTENSION, MAX_LOGO_BYTES } from './image-signature';

const LOGO_DIR = 'company';

@Injectable()
export class CompanyService {
  private readonly uploadsDir: string;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.uploadsDir = path.resolve(config.get<string>('UPLOADS_DIR') ?? 'uploads');
  }

  get() {
    return this.prisma.companyProfile.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
  }

  update(dto: UpdateCompanyDto) {
    return this.prisma.companyProfile.upsert({ where: { id: 'default' }, update: dto, create: { id: 'default', ...dto } });
  }

  /** Stores the logo under UPLOADS_DIR/company/logo-<uuid>.<ext> and records its public /uploads/... path. */
  async setLogo(buffer: Buffer) {
    if (buffer.length === 0) throw new BadRequestException('Empty file');
    if (buffer.length > MAX_LOGO_BYTES) throw new BadRequestException('Logo must be 2 MB or smaller');
    const kind = detectImage(buffer);
    if (!kind) throw new BadRequestException('Logo must be a PNG, JPEG or WebP image');

    const dir = path.join(this.uploadsDir, LOGO_DIR);
    await fs.mkdir(dir, { recursive: true });
    const filename = `logo-${randomUUID()}.${EXTENSION[kind]}`;
    await fs.writeFile(path.join(dir, filename), buffer);

    const previous = await this.get();
    const profile = await this.prisma.companyProfile.update({ where: { id: 'default' }, data: { logoPath: `/uploads/${LOGO_DIR}/${filename}` } });
    await this.removeFile(previous.logoPath); // only after the new one is safely recorded
    return profile;
  }

  async clearLogo() {
    const previous = await this.get();
    const profile = await this.prisma.companyProfile.update({ where: { id: 'default' }, data: { logoPath: null } });
    await this.removeFile(previous.logoPath);
    return profile;
  }

  /** Deletes a previously stored logo file; ignores anything outside our logo dir or already gone. */
  private async removeFile(publicPath: string | null) {
    if (!publicPath) return;
    const rel = publicPath.replace(/^\/uploads\//, '');
    const abs = path.resolve(this.uploadsDir, rel);
    if (!abs.startsWith(path.join(this.uploadsDir, LOGO_DIR))) return; // never delete outside the logo dir
    await fs.unlink(abs).catch(() => undefined);
  }
}
