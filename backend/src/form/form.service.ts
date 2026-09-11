import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FieldType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFieldDto, CreateOptionDto, UpdateFieldDto, UpdateOptionDto } from './dto/field.dto';
import { CreateSectionDto, ReorderDto, UpdateSectionDto } from './dto/section.dto';
import { hasOptions, validateConfig } from './field-config';

const STEP = 10;

@Injectable()
export class FormService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- read

  /** Full definition. includeInactive=true is for the builder UI; false is what the inspection form renders. */
  getDefinition(includeInactive = false) {
    const activeFilter = includeInactive ? {} : { active: true };
    return this.prisma.formSection.findMany({
      where: activeFilter,
      orderBy: { sortOrder: 'asc' },
      include: {
        fields: {
          where: activeFilter,
          orderBy: { sortOrder: 'asc' },
          include: { options: { where: activeFilter, orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
  }

  // ---------------------------------------------------------------- sections

  async createSection(dto: CreateSectionDto) {
    const sortOrder = await this.nextSort(this.prisma.formSection, {});
    return this.prisma.formSection.create({ data: { titleEn: dto.titleEn, titleIt: dto.titleIt, sortOrder } });
  }

  async updateSection(id: string, dto: UpdateSectionDto) {
    await this.mustExist(this.prisma.formSection, id, 'Section');
    return this.prisma.formSection.update({ where: { id }, data: dto });
  }

  /** Hard delete only when the section has no fields at all; otherwise deactivate. */
  async deleteSection(id: string) {
    const section = await this.prisma.formSection.findUnique({ where: { id }, include: { _count: { select: { fields: true } } } });
    if (!section) throw new NotFoundException('Section not found');
    if (section._count.fields > 0) throw new ConflictException('Section has fields — deactivate it instead');
    await this.prisma.formSection.delete({ where: { id } });
  }

  reorderSections(dto: ReorderDto) {
    return this.reorder(dto.ids, (id, sortOrder) => this.prisma.formSection.update({ where: { id }, data: { sortOrder } }), 'Section');
  }

  // ---------------------------------------------------------------- fields

  async createField(sectionId: string, dto: CreateFieldDto) {
    await this.mustExist(this.prisma.formSection, sectionId, 'Section');
    const config = validateConfig(dto.type, dto.config);
    if (hasOptions(dto.type) && !dto.options?.length) throw new BadRequestException(`${dto.type} needs at least one option`);
    if (!hasOptions(dto.type) && dto.options?.length) throw new BadRequestException(`${dto.type} does not take options`);

    const sortOrder = await this.nextSort(this.prisma.formField, { sectionId });
    return this.prisma.formField.create({
      data: {
        sectionId,
        labelEn: dto.labelEn,
        labelIt: dto.labelIt,
        type: dto.type,
        required: dto.required ?? false,
        showInReport: dto.showInReport ?? true,
        sortOrder,
        config: config as Prisma.InputJsonObject,
        options: dto.options?.length
          ? { create: dto.options.map((o, i) => ({ labelEn: o.labelEn, labelIt: o.labelIt, sortOrder: (i + 1) * STEP })) }
          : undefined,
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateField(id: string, dto: UpdateFieldDto) {
    const field = await this.prisma.formField.findUnique({
      where: { id },
      include: { _count: { select: { values: true, options: { where: { active: true } } } } },
    });
    if (!field) throw new NotFoundException('Field not found');

    const nextType = dto.type ?? field.type;
    if (dto.type && dto.type !== field.type) {
      if (field._count.values > 0) {
        throw new ConflictException('Field already has recorded values — create a new field instead of changing its type');
      }
      if (hasOptions(dto.type) && field._count.options === 0) {
        throw new BadRequestException(`${dto.type} needs at least one option — add options first`);
      }
    }
    // config is validated against the *resulting* type; on type change the old config is dropped unless provided
    const config =
      dto.config !== undefined || dto.type !== undefined
        ? validateConfig(nextType, dto.config ?? (dto.type ? {} : field.config))
        : undefined;

    if (dto.active === true && hasOptions(nextType) && field._count.options === 0) {
      throw new BadRequestException('Cannot activate a choice field with no active options');
    }

    return this.prisma.formField.update({
      where: { id },
      data: {
        labelEn: dto.labelEn,
        labelIt: dto.labelIt,
        type: dto.type,
        required: dto.required,
        showInReport: dto.showInReport,
        active: dto.active,
        config: config as Prisma.InputJsonObject | undefined,
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  /** Hard delete only when no record has ever used the field; otherwise deactivate (D3). */
  async deleteField(id: string) {
    const field = await this.prisma.formField.findUnique({ where: { id }, include: { _count: { select: { values: true } } } });
    if (!field) throw new NotFoundException('Field not found');
    if (field._count.values > 0) throw new ConflictException('Field has recorded values — deactivate it instead');
    await this.prisma.formField.delete({ where: { id } }); // options cascade
  }

  async reorderFields(sectionId: string, dto: ReorderDto) {
    const fields = await this.prisma.formField.findMany({ where: { id: { in: dto.ids } }, select: { id: true, sectionId: true } });
    if (fields.some((f) => f.sectionId !== sectionId)) throw new BadRequestException('All fields must belong to the section');
    return this.reorder(dto.ids, (id, sortOrder) => this.prisma.formField.update({ where: { id }, data: { sortOrder } }), 'Field');
  }

  // ---------------------------------------------------------------- options

  async addOption(fieldId: string, dto: CreateOptionDto) {
    const field = await this.prisma.formField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException('Field not found');
    if (!hasOptions(field.type)) throw new BadRequestException(`${field.type} does not take options`);
    const sortOrder = await this.nextSort(this.prisma.formFieldOption, { fieldId });
    return this.prisma.formFieldOption.create({ data: { fieldId, labelEn: dto.labelEn, labelIt: dto.labelIt, sortOrder } });
  }

  async updateOption(id: string, dto: UpdateOptionDto) {
    await this.mustExist(this.prisma.formFieldOption, id, 'Option');
    return this.prisma.formFieldOption.update({ where: { id }, data: dto });
  }

  /**
   * Options are referenced by id inside RecordValue JSON (no FK), so we check usage
   * by JSON query before hard-deleting; otherwise deactivate.
   */
  async deleteOption(id: string) {
    const option = await this.prisma.formFieldOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Option not found');
    const used = await this.prisma.recordValue.count({
      where: {
        fieldId: option.fieldId,
        OR: [
          { value: { path: ['optionId'], equals: id } },
          { value: { path: ['options'], array_contains: [{ optionId: id }] } },
        ],
      },
    });
    if (used > 0) throw new ConflictException('Option is used by records — deactivate it instead');
    await this.prisma.formFieldOption.delete({ where: { id } });
  }

  async reorderOptions(fieldId: string, dto: ReorderDto) {
    const opts = await this.prisma.formFieldOption.findMany({ where: { id: { in: dto.ids } }, select: { id: true, fieldId: true } });
    if (opts.some((o) => o.fieldId !== fieldId)) throw new BadRequestException('All options must belong to the field');
    return this.reorder(dto.ids, (id, sortOrder) => this.prisma.formFieldOption.update({ where: { id }, data: { sortOrder } }), 'Option');
  }

  // ---------------------------------------------------------------- helpers

  private async nextSort(delegate: { aggregate: (a: any) => Promise<any> }, where: Record<string, unknown>) {
    const agg = await delegate.aggregate({ where, _max: { sortOrder: true } });
    return ((agg._max?.sortOrder as number | null) ?? 0) + STEP;
  }

  private async mustExist(delegate: { findUnique: (a: any) => Promise<unknown> }, id: string, what: string) {
    if (!(await delegate.findUnique({ where: { id } }))) throw new NotFoundException(`${what} not found`);
  }

  private async reorder(ids: string[], update: (id: string, sortOrder: number) => Prisma.PrismaPromise<unknown>, what: string) {
    if (new Set(ids).size !== ids.length) throw new BadRequestException(`Duplicate ${what.toLowerCase()} ids`);
    await this.prisma.$transaction(ids.map((id, i) => update(id, (i + 1) * STEP)));
    return { ok: true };
  }
}
