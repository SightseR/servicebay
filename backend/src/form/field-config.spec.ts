import { BadRequestException } from '@nestjs/common';
import { FieldType } from '@prisma/client';
import { validateConfig } from './field-config';

describe('validateConfig', () => {
  it('accepts valid NUMBER config', () => {
    expect(validateConfig(FieldType.NUMBER, { unit: '%', min: 0, max: 100 })).toEqual({ unit: '%', min: 0, max: 100 });
  });
  it('accepts empty config for every type', () => {
    for (const t of Object.values(FieldType)) expect(validateConfig(t, undefined)).toEqual({});
  });
  it('rejects keys from another type', () => {
    expect(() => validateConfig(FieldType.CHECKLIST, { unit: '%' })).toThrow(BadRequestException);
    expect(() => validateConfig(FieldType.TEXT, { allowNote: true })).toThrow(BadRequestException);
  });
  it('rejects min > max and non-positive step', () => {
    expect(() => validateConfig(FieldType.NUMBER, { min: 10, max: 1 })).toThrow('min must be <= max');
    expect(() => validateConfig(FieldType.NUMBER, { step: 0 })).toThrow('step must be > 0');
  });
  it('rejects wrong value types', () => {
    expect(() => validateConfig(FieldType.CHECKLIST, { allowNote: 'yes' })).toThrow(BadRequestException);
    expect(() => validateConfig(FieldType.TEXTAREA, { maxLength: -1 })).toThrow(BadRequestException);
  });
});
