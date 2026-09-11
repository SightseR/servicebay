import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FieldType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FormService } from './form.service';

const ID = '11111111-1111-4111-8111-111111111111';
const SEC = '22222222-2222-4222-8222-222222222222';

describe('FormService', () => {
  let service: FormService;
  const prisma: any = {
    formSection: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), aggregate: jest.fn() },
    formField: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), aggregate: jest.fn() },
    formFieldOption: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), aggregate: jest.fn() },
    recordValue: { count: jest.fn() },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
    for (const d of [prisma.formSection, prisma.formField, prisma.formFieldOption]) {
      d.update.mockImplementation(async ({ data }: { data: unknown }) => data);
      d.create.mockImplementation(async ({ data }: { data: unknown }) => data);
      d.aggregate.mockResolvedValue({ _max: { sortOrder: 20 } });
    }
    const mod = await Test.createTestingModule({ providers: [FormService, { provide: PrismaService, useValue: prisma }] }).compile();
    service = mod.get(FormService);
  });

  describe('createField', () => {
    beforeEach(() => prisma.formSection.findUnique.mockResolvedValue({ id: SEC }));

    it('appends after the highest sortOrder', async () => {
      const f = await service.createField(SEC, { label: 'X', type: FieldType.TEXT });
      expect(f.sortOrder).toBe(30);
    });
    it('choice types need options', async () => {
      await expect(service.createField(SEC, { label: 'X', type: FieldType.DROPDOWN })).rejects.toBeInstanceOf(BadRequestException);
      const f = await service.createField(SEC, { label: 'X', type: FieldType.DROPDOWN, options: [{ label: 'A' }, { label: 'B' }] });
      expect((f as any).options.create).toHaveLength(2);
      expect((f as any).options.create[1].sortOrder).toBe(20);
    });
    it('non-choice types reject options', async () => {
      await expect(service.createField(SEC, { label: 'X', type: FieldType.NUMBER, options: [{ label: 'A' }] })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('validates config for the type', async () => {
      await expect(service.createField(SEC, { label: 'X', type: FieldType.TEXT, config: { unit: '%' } })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateField', () => {
    it('blocks type change once values exist', async () => {
      prisma.formField.findUnique.mockResolvedValue({ id: ID, type: FieldType.TEXT, config: {}, _count: { values: 3, options: 0 } });
      await expect(service.updateField(ID, { type: FieldType.NUMBER })).rejects.toBeInstanceOf(ConflictException);
    });
    it('allows type change with no values and resets config', async () => {
      prisma.formField.findUnique.mockResolvedValue({ id: ID, type: FieldType.TEXT, config: { placeholder: 'p' }, _count: { values: 0, options: 0 } });
      const r = await service.updateField(ID, { type: FieldType.NUMBER });
      expect(r.type).toBe(FieldType.NUMBER);
      expect(r.config).toEqual({});
    });
    it('blocks changing to a choice type without options', async () => {
      prisma.formField.findUnique.mockResolvedValue({ id: ID, type: FieldType.TEXT, config: {}, _count: { values: 0, options: 0 } });
      await expect(service.updateField(ID, { type: FieldType.DROPDOWN })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('blocks activating a choice field with no active options', async () => {
      prisma.formField.findUnique.mockResolvedValue({ id: ID, type: FieldType.DROPDOWN, config: {}, _count: { values: 0, options: 0 } });
      await expect(service.updateField(ID, { active: true })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('validates config against the current type', async () => {
      prisma.formField.findUnique.mockResolvedValue({ id: ID, type: FieldType.NUMBER, config: {}, _count: { values: 5, options: 0 } });
      await expect(service.updateField(ID, { config: { allowNote: true } })).rejects.toBeInstanceOf(BadRequestException);
      const r = await service.updateField(ID, { config: { unit: 'mm' } });
      expect(r.config).toEqual({ unit: 'mm' });
    });
  });

  describe('delete guards', () => {
    it('field with values cannot be deleted', async () => {
      prisma.formField.findUnique.mockResolvedValue({ id: ID, _count: { values: 1 } });
      await expect(service.deleteField(ID)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.formField.delete).not.toHaveBeenCalled();
    });
    it('unused field is hard-deleted', async () => {
      prisma.formField.findUnique.mockResolvedValue({ id: ID, _count: { values: 0 } });
      await service.deleteField(ID);
      expect(prisma.formField.delete).toHaveBeenCalledWith({ where: { id: ID } });
    });
    it('section with fields cannot be deleted', async () => {
      prisma.formSection.findUnique.mockResolvedValue({ id: SEC, _count: { fields: 2 } });
      await expect(service.deleteSection(SEC)).rejects.toBeInstanceOf(ConflictException);
    });
    it('option used in a record cannot be deleted', async () => {
      prisma.formFieldOption.findUnique.mockResolvedValue({ id: ID, fieldId: SEC });
      prisma.recordValue.count.mockResolvedValue(2);
      await expect(service.deleteOption(ID)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('reorder', () => {
    it('assigns 10,20,30 in given order inside a transaction', async () => {
      await service.reorderSections({ ids: [SEC, ID] });
      expect(prisma.formSection.update).toHaveBeenNthCalledWith(1, { where: { id: SEC }, data: { sortOrder: 10 } });
      expect(prisma.formSection.update).toHaveBeenNthCalledWith(2, { where: { id: ID }, data: { sortOrder: 20 } });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
    it('rejects duplicates and cross-section fields', async () => {
      await expect(service.reorderSections({ ids: [ID, ID] })).rejects.toBeInstanceOf(BadRequestException);
      prisma.formField.findMany.mockResolvedValue([{ id: ID, sectionId: 'other' }]);
      await expect(service.reorderFields(SEC, { ids: [ID] })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
