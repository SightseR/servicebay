import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { RecordsService } from './records.service';

const REC = '33333333-3333-4333-8333-333333333333';
const admin = { id: 'a', email: 'a@x', displayName: 'A', role: Role.ADMIN, status: UserStatus.ACTIVE, mustChangePassword: false };
const other = { ...admin, id: 'b' };
const manager = { ...admin, id: 'm', role: Role.MANAGER };

describe('RecordsService.remove', () => {
  let service: RecordsService;
  const prisma: any = { serviceRecord: { findUnique: jest.fn(), delete: jest.fn() } };

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      providers: [RecordsService, { provide: PrismaService, useValue: prisma }, { provide: VehiclesService, useValue: {} }],
    }).compile();
    service = mod.get(RecordsService);
    prisma.serviceRecord.findUnique.mockResolvedValue({ id: REC, createdById: 'a' });
  });

  it('creator can delete', async () => {
    await service.remove(REC, admin);
    expect(prisma.serviceRecord.delete).toHaveBeenCalledWith({ where: { id: REC } });
  });
  it('another admin cannot', async () => {
    await expect(service.remove(REC, other)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.serviceRecord.delete).not.toHaveBeenCalled();
  });
  it('manager can delete anything', async () => {
    await service.remove(REC, manager);
    expect(prisma.serviceRecord.delete).toHaveBeenCalled();
  });
});
