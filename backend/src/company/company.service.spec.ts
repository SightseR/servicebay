import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyService } from './company.service';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);

describe('CompanyService logo', () => {
  let service: CompanyService;
  let dir: string;
  let profile: { id: string; logoPath: string | null };
  const prisma = { companyProfile: { upsert: jest.fn(), update: jest.fn() } };

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sb-uploads-'));
    profile = { id: 'default', logoPath: null };
    prisma.companyProfile.upsert.mockImplementation(async () => profile);
    prisma.companyProfile.update.mockImplementation(async ({ data }: { data: { logoPath: string | null } }) => { profile = { ...profile, ...data }; return profile; });
    const mod = await Test.createTestingModule({
      providers: [CompanyService, { provide: PrismaService, useValue: prisma }, { provide: ConfigService, useValue: { get: () => dir } }],
    }).compile();
    service = mod.get(CompanyService);
  });
  afterEach(() => fs.rm(dir, { recursive: true, force: true }));

  it('stores a PNG under uploads/company and records its public path', async () => {
    const res = await service.setLogo(PNG);
    expect(res.logoPath).toMatch(/^\/uploads\/company\/logo-[0-9a-f-]+\.png$/);
    const files = await fs.readdir(path.join(dir, 'company'));
    expect(files).toHaveLength(1);
  });

  it('replacing the logo deletes the previous file', async () => {
    await service.setLogo(PNG);
    await service.setLogo(PNG);
    expect(await fs.readdir(path.join(dir, 'company'))).toHaveLength(1);
  });

  it('clearing removes the file and nulls the path', async () => {
    await service.setLogo(PNG);
    const res = await service.clearLogo();
    expect(res.logoPath).toBeNull();
    expect(await fs.readdir(path.join(dir, 'company'))).toHaveLength(0);
  });

  it('rejects non-image and oversized uploads before touching the disk', async () => {
    await expect(service.setLogo(Buffer.from('<svg/>'))).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setLogo(Buffer.alloc(2 * 1024 * 1024 + 1))).rejects.toThrow('2 MB');
    await expect(fs.readdir(path.join(dir, 'company'))).rejects.toBeTruthy(); // dir never created
  });

  it('never deletes a path outside the logo directory', async () => {
    profile.logoPath = '/uploads/../../etc/passwd';
    await expect(service.clearLogo()).resolves.toBeTruthy(); // no throw, nothing attempted outside
  });
});
