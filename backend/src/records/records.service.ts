import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../auth/types';
import { paginate } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService, vehicleSummary } from '../vehicles/vehicles.service';
import { CreateRecordDto, ListRecordsDto, UpdateRecordDto } from './dto/record.dto';
import { FieldDef, normaliseValues, StoredValue } from './record-values';

const userRef = { select: { id: true, displayName: true } } as const;

const recordDetail = {
  id: true, kilometers: true, gearbox: true, motivePower: true, driveMode: true,
  servicedAt: true, legacyId: true, createdAt: true, updatedAt: true,
  vehicle: { select: vehicleSummary },
  createdBy: userRef, updatedBy: userRef,
  values: {
    select: {
      fieldId: true, value: true, labelSnapshotEn: true, labelSnapshotIt: true,
      field: { select: { type: true, sectionId: true, sortOrder: true, showInReport: true, section: { select: { id: true, titleEn: true, titleIt: true, sortOrder: true } } } },
    },
  },
} as const;

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService, private readonly vehicles: VehiclesService) {}

  // ---------------------------------------------------------------- list / get

  async list(dto: ListRecordsDto) {
    const where: Prisma.ServiceRecordWhereInput = {
      ...(dto.vehicleId ? { vehicleId: dto.vehicleId } : {}),
      ...(dto.q ? { vehicle: this.vehicles.searchWhere(dto.q) } : {}),
      ...(dto.from || dto.to
        ? { servicedAt: { ...(dto.from ? { gte: new Date(dto.from) } : {}), ...(dto.to ? { lte: new Date(dto.to) } : {}) } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceRecord.findMany({
        where,
        select: {
          id: true, servicedAt: true, kilometers: true, legacyId: true, createdAt: true,
          vehicle: { select: { id: true, regNumber: true, brand: true, model: true, year: true, ownerName: true } },
          createdBy: userRef,
          _count: { select: { values: true } },
        },
        orderBy: { servicedAt: 'desc' },
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.serviceRecord.count({ where }),
    ]);
    return paginate(items.map(({ _count, ...r }) => ({ ...r, valueCount: _count.values })), total, dto);
  }

  async get(id: string) {
    const r = await this.prisma.serviceRecord.findUnique({ where: { id }, select: recordDetail });
    if (!r) throw new NotFoundException('Record not found');
    return this.shape(r);
  }

  // ---------------------------------------------------------------- create / update / delete

  async create(dto: CreateRecordDto, actor: AuthUser) {
    if (!dto.vehicleId && !dto.vehicle) throw new BadRequestException('Provide vehicleId or vehicle');
    if (dto.vehicleId && dto.vehicle) throw new BadRequestException('Provide either vehicleId or vehicle, not both');

    const fields = await this.loadFields();
    const { values, errors } = normaliseValues(fields, dto.values);
    if (errors.length) throw new BadRequestException({ message: 'Invalid values', errors });

    const vehicleId = dto.vehicleId ?? (await this.vehicles.create(dto.vehicle!)).id;
    if (dto.vehicleId && !(await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId }, select: { id: true } }))) {
      throw new NotFoundException('Vehicle not found');
    }
    // Default the spec snapshot from the vehicle when not supplied.
    const v = await this.prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });

    const r = await this.prisma.serviceRecord.create({
      data: {
        vehicleId,
        kilometers: dto.kilometers ?? null,
        gearbox: dto.gearbox === undefined ? v.gearbox : dto.gearbox,
        motivePower: dto.motivePower === undefined ? v.motivePower : dto.motivePower,
        driveMode: dto.driveMode === undefined ? v.driveMode : dto.driveMode,
        servicedAt: dto.servicedAt ? new Date(dto.servicedAt) : new Date(),
        createdById: actor.id,
        updatedById: actor.id,
        values: { create: values.map((x) => ({ fieldId: x.fieldId, value: x.value as Prisma.InputJsonObject, labelSnapshotEn: x.labelSnapshotEn, labelSnapshotIt: x.labelSnapshotIt })) },
      },
      select: recordDetail,
    });
    // keep the vehicle's spec current with the latest visit
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { gearbox: r.gearbox ?? undefined, motivePower: r.motivePower ?? undefined, driveMode: r.driveMode ?? undefined },
    });
    return this.shape(r);
  }

  async update(id: string, dto: UpdateRecordDto, actor: AuthUser) {
    const existing = await this.prisma.serviceRecord.findUnique({ where: { id }, select: { id: true, values: { select: { fieldId: true } } } });
    if (!existing) throw new NotFoundException('Record not found');

    let valueOps: Prisma.ServiceRecordUpdateInput['values'];
    if (dto.values) {
      const fields = await this.loadFields(true);
      const kept = new Set<string>(existing.values.map((x: { fieldId: string }) => x.fieldId));
      const { values, errors } = normaliseValues(fields, dto.values, kept);
      if (errors.length) throw new BadRequestException({ message: 'Invalid values', errors });
      valueOps = {
        deleteMany: {},
        create: values.map((x) => ({ fieldId: x.fieldId, value: x.value as Prisma.InputJsonObject, labelSnapshotEn: x.labelSnapshotEn, labelSnapshotIt: x.labelSnapshotIt })),
      };
    }

    const r = await this.prisma.serviceRecord.update({
      where: { id },
      data: {
        kilometers: dto.kilometers,
        gearbox: dto.gearbox,
        motivePower: dto.motivePower,
        driveMode: dto.driveMode,
        servicedAt: dto.servicedAt ? new Date(dto.servicedAt) : undefined,
        updatedBy: { connect: { id: actor.id } },
        values: valueOps,
      },
      select: recordDetail,
    });
    return this.shape(r);
  }

  /** D2: ADMIN may delete only their own records; MANAGER any. */
  async remove(id: string, actor: AuthUser) {
    const r = await this.prisma.serviceRecord.findUnique({ where: { id }, select: { id: true, createdById: true } });
    if (!r) throw new NotFoundException('Record not found');
    if (actor.role !== Role.MANAGER && r.createdById !== actor.id) {
      throw new ForbiddenException('Only the creator or a manager can delete this record');
    }
    await this.prisma.serviceRecord.delete({ where: { id } }); // values cascade
  }

  // ---------------------------------------------------------------- report (D4)

  async report(id: string) {
    const [record, company] = await Promise.all([
      this.get(id),
      this.prisma.companyProfile.findUnique({ where: { id: 'default' } }),
    ]);
    const sections = record.sections
      .map((s) => ({ ...s, items: s.items.filter((i) => i.showInReport) }))
      .filter((s) => s.items.length > 0);
    return {
      company: company ?? null,
      vehicle: record.vehicle,
      record: {
        id: record.id, legacyId: record.legacyId, servicedAt: record.servicedAt, kilometers: record.kilometers,
        gearbox: record.gearbox, motivePower: record.motivePower, driveMode: record.driveMode,
        createdBy: record.createdBy, createdAt: record.createdAt, updatedAt: record.updatedAt,
      },
      sections,
      generatedAt: new Date(),
    };
  }

  // ---------------------------------------------------------------- helpers

  private loadFields(includeInactive = false): Promise<FieldDef[]> {
    return this.prisma.formField.findMany({
      where: includeInactive ? {} : { active: true, section: { active: true } },
      select: { id: true, labelEn: true, labelIt: true, type: true, required: true, active: true, config: true, options: { select: { id: true, labelEn: true, labelIt: true, active: true } } },
    }) as unknown as Promise<FieldDef[]>;
  }

  /** Groups flat values into ordered sections → items, using bilingual label snapshots (D10). */
  private shape<T extends { values: { fieldId: string; value: unknown; labelSnapshotEn: string; labelSnapshotIt: string | null; field: { type: string; sectionId: string; sortOrder: number; showInReport: boolean; section: { id: string; titleEn: string; titleIt: string | null; sortOrder: number } } }[] }>(r: T) {
    const { values, ...rest } = r;
    const sectionMap = new Map<string, { id: string; titleEn: string; titleIt: string | null; sortOrder: number; items: { fieldId: string; labelEn: string; labelIt: string | null; type: string; sortOrder: number; showInReport: boolean; value: StoredValue }[] }>();
    for (const v of values) {
      const s = v.field.section;
      if (!sectionMap.has(s.id)) sectionMap.set(s.id, { id: s.id, titleEn: s.titleEn, titleIt: s.titleIt, sortOrder: s.sortOrder, items: [] });
      sectionMap.get(s.id)!.items.push({
        fieldId: v.fieldId, labelEn: v.labelSnapshotEn, labelIt: v.labelSnapshotIt, type: v.field.type, sortOrder: v.field.sortOrder,
        showInReport: v.field.showInReport, value: v.value as StoredValue,
      });
    }
    const sections = [...sectionMap.values()]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ ...s, items: s.items.sort((a, b) => a.sortOrder - b.sortOrder) }));
    return { ...rest, sections, values: values.map(({ fieldId, value }) => ({ fieldId, value })) };
  }
}
