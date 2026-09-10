import { FieldType } from '@prisma/client';

/** Minimal shape of a field the validator needs (subset of FormField + options). */
export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  active: boolean;
  config: Record<string, unknown>;
  options: { id: string; label: string; active: boolean }[];
}

export interface ValueInput { fieldId: string; value: unknown }

export type ChecklistValue = { done: boolean; urgent: boolean; later: boolean; note?: string };
export type ChoiceValue = { optionId: string; label: string };
export type MultiChoiceValue = { options: ChoiceValue[] };
export type TextValue = { text: string };
export type NumberValue = { number: number };
export type StoredValue = ChecklistValue | ChoiceValue | MultiChoiceValue | TextValue | NumberValue;

export interface ValueError { fieldId: string; label: string; message: string }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Normalises one raw value against its field definition. Returns null when the value is
 * "empty" (nothing selected / blank) — callers drop empty values rather than storing them.
 * Throws a ValueError-shaped object on invalid input.
 */
export function normaliseValue(field: FieldDef, raw: unknown): StoredValue | null {
  const err = (message: string): never => { throw { fieldId: field.id, label: field.label, message } as ValueError; };
  const cfg = field.config;

  switch (field.type) {
    case FieldType.CHECKLIST: {
      if (!isObj(raw)) return err('expected {done, urgent, later, note?}');
      const done = !!raw.done, urgent = !!raw.urgent, later = !!raw.later;
      const note = cfg.allowNote ? str(raw.note) : '';
      if (raw.note !== undefined && !cfg.allowNote && str(raw.note)) return err('this checklist item does not take a note');
      if (!done && !urgent && !later && !note) return null;
      return note ? { done, urgent, later, note } : { done, urgent, later };
    }
    case FieldType.SINGLE_CHOICE:
    case FieldType.DROPDOWN: {
      const optionId = isObj(raw) ? str(raw.optionId) : str(raw);
      if (!optionId) return null;
      const opt = field.options.find((o) => o.id === optionId);
      if (!opt) return err('unknown option');
      if (!opt.active) return err(`option "${opt.label}" is no longer available`);
      return { optionId: opt.id, label: opt.label };
    }
    case FieldType.MULTI_CHOICE: {
      const ids: unknown = isObj(raw) ? raw.options : raw;
      if (!Array.isArray(ids)) return ids == null ? null : err('expected an array of option ids');
      const picked: ChoiceValue[] = [];
      for (const item of ids) {
        const id = isObj(item) ? str(item.optionId) : str(item);
        const opt = field.options.find((o) => o.id === id);
        if (!opt) return err('unknown option');
        if (!opt.active) return err(`option "${opt.label}" is no longer available`);
        if (!picked.some((p) => p.optionId === opt.id)) picked.push({ optionId: opt.id, label: opt.label });
      }
      return picked.length ? { options: picked } : null;
    }
    case FieldType.TEXT:
    case FieldType.TEXTAREA: {
      const text = isObj(raw) ? str(raw.text) : str(raw);
      if (!text) return null;
      const max = typeof cfg.maxLength === 'number' ? cfg.maxLength : field.type === FieldType.TEXT ? 500 : 5000;
      if (text.length > max) return err(`text longer than ${max} characters`);
      return { text };
    }
    case FieldType.NUMBER: {
      const rawNum = isObj(raw) ? raw.number : raw;
      if (rawNum === null || rawNum === undefined || rawNum === '') return null;
      const n = typeof rawNum === 'number' ? rawNum : Number(String(rawNum).trim());
      if (!Number.isFinite(n)) return err('not a number');
      if (typeof cfg.min === 'number' && n < cfg.min) return err(`must be ≥ ${cfg.min}`);
      if (typeof cfg.max === 'number' && n > cfg.max) return err(`must be ≤ ${cfg.max}`);
      return { number: n };
    }
  }
}

export interface NormalisedValue { fieldId: string; value: StoredValue; labelSnapshot: string }

/**
 * Validates a whole submission. `previouslyStoredFieldIds` lets an edit keep values for
 * fields that were deactivated after the record was created (D3: history must survive).
 */
export function normaliseValues(
  fields: FieldDef[],
  inputs: ValueInput[],
  previouslyStoredFieldIds: Set<string> = new Set(),
): { values: NormalisedValue[]; errors: ValueError[] } {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const values: NormalisedValue[] = [];
  const errors: ValueError[] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    const field = byId.get(input.fieldId);
    if (!field) { errors.push({ fieldId: input.fieldId, label: '?', message: 'unknown field' }); continue; }
    if (seen.has(field.id)) { errors.push({ fieldId: field.id, label: field.label, message: 'duplicate value for field' }); continue; }
    seen.add(field.id);
    if (!field.active && !previouslyStoredFieldIds.has(field.id)) {
      errors.push({ fieldId: field.id, label: field.label, message: 'field is no longer active' });
      continue;
    }
    try {
      const v = normaliseValue(field, input.value);
      if (v !== null) values.push({ fieldId: field.id, value: v, labelSnapshot: field.label });
    } catch (e) {
      errors.push(e as ValueError);
    }
  }

  for (const f of fields) {
    if (f.required && f.active && !values.some((v) => v.fieldId === f.id) && !errors.some((e) => e.fieldId === f.id)) {
      errors.push({ fieldId: f.id, label: f.label, message: 'required' });
    }
  }
  return { values, errors };
}

/** Report rule (D4): a stored value is by construction non-empty, so "selected" == stored. */
export const isSelected = (v: StoredValue | null | undefined) => v != null;
