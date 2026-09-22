import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

const MANAGER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = { user: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() }, session: { updateMany: jest.fn() } };

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(UsersService);
    prisma.user.update.mockImplementation(async ({ data }: { data: unknown }) => data);
  });

  it('approve moves PENDING → ACTIVE and records approver', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: OTHER, status: UserStatus.PENDING, role: Role.ADMIN });
    const res = await service.approve(OTHER, MANAGER);
    expect(res.status).toBe(UserStatus.ACTIVE);
    expect((res as any).approvedById).toBe(MANAGER);
  });

  it('approve rejects non-pending', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: OTHER, status: UserStatus.ACTIVE, role: Role.ADMIN });
    await expect(service.approve(OTHER, MANAGER)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cannot demote or disable the last active manager', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: OTHER, status: UserStatus.ACTIVE, role: Role.MANAGER });
    prisma.user.count.mockResolvedValue(0);
    await expect(service.update(OTHER, { role: Role.ADMIN }, MANAGER)).rejects.toThrow('active manager');
    await expect(service.update(OTHER, { status: UserStatus.DISABLED }, MANAGER)).rejects.toThrow('active manager');
  });

  it('cannot change own role or disable self', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: MANAGER, status: UserStatus.ACTIVE, role: Role.MANAGER });
    await expect(service.update(MANAGER, { role: Role.ADMIN }, MANAGER)).rejects.toThrow('own role');
    await expect(service.update(MANAGER, { status: UserStatus.DISABLED }, MANAGER)).rejects.toThrow('own account');
  });

  it('disabling revokes every session of that user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: OTHER, status: UserStatus.ACTIVE, role: Role.ADMIN });
    await service.update(OTHER, { status: UserStatus.DISABLED }, MANAGER);
    expect(prisma.session.updateMany).toHaveBeenCalledWith({ where: { userId: OTHER, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });

  it('a plain rename does not touch sessions', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: OTHER, status: UserStatus.ACTIVE, role: Role.ADMIN });
    await service.update(OTHER, { displayName: 'New Name' }, MANAGER);
    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });
});
