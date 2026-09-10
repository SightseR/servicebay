import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate } from '../common/pagination.dto';
import { regKey } from '../common/reg-key';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, ListVehiclesDto, UpdateVehicleDto } from './dto/vehicle.dto';

export const vehicleSummary = {
  id: true, regNumber: true, brand: true, model: true, year: true,
  gearbox: true, motivePower: true, driveMode: true,
  ownerName: true, ownerPhone: true, ownerEmail: true,
} as const;

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  searchWhere(q?: string): Prisma.VehicleWhereInput {
    if (!q) return {};
    const key = regKey(q);
    return {
      OR: [
        ...(key ? [{ regKey: { contains: key } }] : []),
        { ownerName: { contains: q, mode: 'insensitive' } },
        { ownerPhone: { contains: q } },
        { brand: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
      ],
    };
  }

  async list(dto: ListVehiclesDto) {
    const where = this.searchWhere(dto.q);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        select: { ...vehicleSummary, _count: { select: { records: true } }, records: { select: { servicedAt: true }, orderBy: { servicedAt: 'desc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return paginate(
      items.map(({ _count, records, ...v }) => ({ ...v, recordCount: _count.records, lastServicedAt: records[0]?.servicedAt ?? null })),
      total,
      dto,
    );
  }

  /** Exact lookup by registration (frontend uses this before creating a new vehicle). */
  findByReg(reg: string) {
    return this.prisma.vehicle.findUnique({ where: { regKey: regKey(reg) }, select: vehicleSummary });
  }

  async get(id: string) {
    const v = await this.prisma.vehicle.findUnique({
      where: { id },
      select: {
        ...vehicleSummary, createdAt: true, updatedAt: true,
        records: {
          orderBy: { servicedAt: 'desc' },
          select: { id: true, servicedAt: true, kilometers: true, createdBy: { select: { id: true, displayName: true } } },
        },
      },
    });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  async create(dto: CreateVehicleDto) {
    const key = regKey(dto.regNumber);
    const existing = await this.prisma.vehicle.findUnique({ where: { regKey: key }, select: { id: true, regNumber: true } });
    if (existing) throw new ConflictException({ message: 'Vehicle with this registration already exists', existingVehicleId: existing.id });
    return this.prisma.vehicle.create({ data: { ...dto, regKey: key }, select: vehicleSummary });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const v = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Vehicle not found');
    let key: string | undefined;
    if (dto.regNumber) {
      key = regKey(dto.regNumber);
      const clash = await this.prisma.vehicle.findFirst({ where: { regKey: key, NOT: { id } }, select: { id: true } });
      if (clash) throw new ConflictException({ message: 'Another vehicle has this registration', existingVehicleId: clash.id });
    }
    return this.prisma.vehicle.update({ where: { id }, data: { ...dto, ...(key ? { regKey: key } : {}) }, select: vehicleSummary });
  }

  async remove(id: string) {
    const v = await this.prisma.vehicle.findUnique({ where: { id }, include: { _count: { select: { records: true } } } });
    if (!v) throw new NotFoundException('Vehicle not found');
    if (v._count.records > 0) throw new ConflictException('Vehicle has service records — delete those first');
    await this.prisma.vehicle.delete({ where: { id } });
  }
}
