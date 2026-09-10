import { BadRequestException } from '@nestjs/common';
import { FieldType } from '@prisma/client';

/** Per-type config contracts (D3). Unknown keys are rejected so the frontend and report renderer can rely on the shape. */
export interface ChecklistConfig { allowNote?: boolean; notePlaceholder?: string; legacyKey?: string }
export interface NumberConfig { unit?: string; min?: number; max?: number; step?: number; legacyKey?: string }
export interface TextConfig { placeholder?: string; maxLength?: number; legacyKey?: string }
export interface ChoiceConfig { placeholder?: string; legacyKey?: string }

const ALLOWED: Record<FieldType, string[]> = {
  CHECKLIST: ['allowNote', 'notePlaceholder', 'legacyKey'],
  NUMBER: ['unit', 'min', 'max', 'step', 'legacyKey'],
  TEXT: ['placeholder', 'maxLength', 'legacyKey'],
  TEXTAREA: ['placeholder', 'maxLength', 'legacyKey'],
  SINGLE_CHOICE: ['placeholder', 'legacyKey'],
  DROPDOWN: ['placeholder', 'legacyKey'],
  MULTI_CHOICE: ['placeholder', 'legacyKey'],
};

export const CHOICE_TYPES: FieldType[] = [FieldType.SINGLE_CHOICE, FieldType.DROPDOWN, FieldType.MULTI_CHOICE];
export const hasOptions = (t: FieldType) => CHOICE_TYPES.includes(t);

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown) => typeof v === 'string';
const isBool = (v: unknown) => typeof v === 'boolean';

/** Throws BadRequestException on invalid config; returns a cleaned copy. */
export function validateConfig(type: FieldType, raw: unknown): Record<string, unknown> {
  const cfg = (raw ?? {}) as Record<string, unknown>;
  if (typeof cfg !== 'object' || Array.isArray(cfg)) throw new BadRequestException('config must be an object');

  const unknown = Object.keys(cfg).filter((k) => !ALLOWED[type].includes(k));
  if (unknown.length) throw new BadRequestException(`config keys not allowed for ${type}: ${unknown.join(', ')}`);

  const fail = (m: string) => { throw new BadRequestException(`config.${m}`); };
  if ('legacyKey' in cfg && !isStr(cfg.legacyKey)) fail('legacyKey must be a string');
  if ('allowNote' in cfg && !isBool(cfg.allowNote)) fail('allowNote must be boolean');
  if ('notePlaceholder' in cfg && !isStr(cfg.notePlaceholder)) fail('notePlaceholder must be a string');
  if ('placeholder' in cfg && !isStr(cfg.placeholder)) fail('placeholder must be a string');
  if ('unit' in cfg && !isStr(cfg.unit)) fail('unit must be a string');
  if ('maxLength' in cfg && (!isNum(cfg.maxLength) || (cfg.maxLength as number) < 1)) fail('maxLength must be a positive number');
  for (const k of ['min', 'max', 'step'] as const) if (k in cfg && !isNum(cfg[k])) fail(`${k} must be a number`);
  if (isNum(cfg.min) && isNum(cfg.max) && (cfg.min as number) > (cfg.max as number)) fail('min must be <= max');
  if (isNum(cfg.step) && (cfg.step as number) <= 0) fail('step must be > 0');
  return { ...cfg };
}
