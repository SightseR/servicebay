import { FieldType } from '@prisma/client';
import { FieldDef, normaliseValue, normaliseValues } from './record-values';

const f = (over: Partial<FieldDef>): FieldDef => ({
  id: 'f1', labelEn: 'Field', labelIt: null, type: FieldType.TEXT, required: false, active: true, config: {}, options: [], ...over,
});

describe('normaliseValue', () => {
  it('CHECKLIST: empty flags → null, flags kept, note only when allowed', () => {
    const c = f({ type: FieldType.CHECKLIST });
    expect(normaliseValue(c, { done: false, urgent: false, later: false })).toBeNull();
    expect(normaliseValue(c, { done: true })).toEqual({ done: true, urgent: false, later: false });
    expect(() => normaliseValue(c, { done: true, note: 'x' })).toThrow();
    const n = f({ type: FieldType.CHECKLIST, config: { allowNote: true } });
    expect(normaliseValue(n, { note: ' fault code ' })).toEqual({ done: false, urgent: false, later: false, note: 'fault code' });
  });

  it('DROPDOWN: resolves option label (both languages), rejects unknown/inactive', () => {
    const d = f({ type: FieldType.DROPDOWN, options: [{ id: 'o1', labelEn: 'Summer', labelIt: 'Estate', active: true }, { id: 'o2', labelEn: 'Old', labelIt: null, active: false }] });
    expect(normaliseValue(d, 'o1')).toEqual({ optionId: 'o1', labelEn: 'Summer', labelIt: 'Estate' });
    expect(normaliseValue(d, { optionId: 'o1' })).toEqual({ optionId: 'o1', labelEn: 'Summer', labelIt: 'Estate' });
    expect(normaliseValue(d, '')).toBeNull();
    expect(() => normaliseValue(d, 'nope')).toThrow();
    expect(() => normaliseValue(d, 'o2')).toThrow();
  });

  it('MULTI_CHOICE: dedupes, preserves order, empty → null', () => {
    const m = f({ type: FieldType.MULTI_CHOICE, options: [{ id: 'a', labelEn: 'A', labelIt: null, active: true }, { id: 'b', labelEn: 'B', labelIt: null, active: true }] });
    expect(normaliseValue(m, ['b', 'a', 'b'])).toEqual({ options: [{ optionId: 'b', labelEn: 'B', labelIt: null }, { optionId: 'a', labelEn: 'A', labelIt: null }] });
    expect(normaliseValue(m, [])).toBeNull();
    expect(() => normaliseValue(m, 'a')).toThrow();
  });

  it('TEXT: trims, blank → null, maxLength enforced', () => {
    expect(normaliseValue(f({}), '  hi  ')).toEqual({ text: 'hi' });
    expect(normaliseValue(f({}), '   ')).toBeNull();
    expect(() => normaliseValue(f({ config: { maxLength: 3 } }), 'abcd')).toThrow('longer than 3');
  });

  it('NUMBER: coerces strings (legacy data), range enforced, blank → null', () => {
    const n = f({ type: FieldType.NUMBER, config: { min: 0, max: 100 } });
    expect(normaliseValue(n, '80')).toEqual({ number: 80 });
    expect(normaliseValue(n, { number: 12.5 })).toEqual({ number: 12.5 });
    expect(normaliseValue(n, '')).toBeNull();
    expect(() => normaliseValue(n, 'abc')).toThrow('not a number');
    expect(() => normaliseValue(n, 101)).toThrow('≤ 100');
  });
});

describe('normaliseValues', () => {
  const fields = [
    f({ id: 'req', labelEn: 'Reg check', type: FieldType.CHECKLIST, required: true }),
    f({ id: 'txt', labelEn: 'Note' }),
    f({ id: 'old', labelEn: 'Retired', active: false }),
  ];

  it('drops empty values and reports missing required', () => {
    const r = normaliseValues(fields, [{ fieldId: 'txt', value: '' }]);
    expect(r.values).toEqual([]);
    expect(r.errors).toEqual([{ fieldId: 'req', label: 'Reg check', message: 'required' }]);
  });

  it('stores bilingual label snapshot', () => {
    const withIt = [f({ id: 'req', labelEn: 'Reg check', labelIt: 'Controllo', type: FieldType.CHECKLIST, required: true }), f({ id: 'txt', labelEn: 'Note' })];
    const r = normaliseValues(withIt, [{ fieldId: 'req', value: { urgent: true } }, { fieldId: 'txt', value: 'x' }]);
    expect(r.errors).toEqual([]);
    expect(r.values.map((v) => [v.labelSnapshotEn, v.labelSnapshotIt])).toEqual([['Reg check', 'Controllo'], ['Note', null]]);
  });

  it('rejects unknown, duplicate and inactive fields on create', () => {
    const r = normaliseValues(fields, [
      { fieldId: 'req', value: { done: true } }, { fieldId: 'req', value: { done: true } },
      { fieldId: 'ghost', value: 'x' }, { fieldId: 'old', value: 'x' },
    ]);
    expect(r.errors.map((e) => e.message)).toEqual(['duplicate value for field', 'unknown field', 'field is no longer active']);
  });

  it('keeps a value for an inactive field on edit if the record already had it', () => {
    const r = normaliseValues(fields, [{ fieldId: 'req', value: { done: true } }, { fieldId: 'old', value: 'still here' }], new Set(['old']));
    expect(r.errors).toEqual([]);
    expect(r.values).toHaveLength(2);
  });
});
