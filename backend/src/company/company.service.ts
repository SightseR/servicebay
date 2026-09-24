import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateCompanyDto } from './dto/company.dto';
import { detectImage, EXTENSION, MAX_LOGO_BYTES } from './image-signature';

const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  get() {
    return this.prisma.companyProfile.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
  }

  update(dto: UpdateCompanyDto) {
    return this.prisma.companyProfile.upsert({ where: { id: 'default' }, update: dto, create: { id: 'default', ...dto } });
  }

  /** Validates by magic bytes, stores via the configured driver, records the public path; removes the previous file after. */
  async setLogo(buffer: Buffer) {
    if (buffer.length === 0) throw new BadRequestException('Empty file');
    if (buffer.length > MAX_LOGO_BYTES) throw new BadRequestException('Logo must be 2 MB or smaller');
    const kind = detectImage(buffer);
    if (!kind) throw new BadRequestException('Logo must be a PNG, JPEG or WebP image');

    const stored = await this.storage.put(`company/logo-${randomUUID()}.${EXTENSION[kind]}`, buffer, MIME[kind]);
    const previous = await this.get();
    const profile = await this.prisma.companyProfile.update({ where: { id: 'default' }, data: { logoPath: stored.publicPath } });
    await this.storage.remove(previous.logoPath ?? ''); // only after the new one is safely recorded
    return profile;
  }

  async clearLogo() {
    const previous = await this.get();
    const profile = await this.prisma.companyProfile.update({ where: { id: 'default' }, data: { logoPath: null } });
    await this.storage.remove(previous.logoPath ?? '');
    return profile;
  }
}
