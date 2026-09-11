export type FieldType = 'CHECKLIST' | 'SINGLE_CHOICE' | 'DROPDOWN' | 'MULTI_CHOICE' | 'TEXT' | 'TEXTAREA' | 'NUMBER';

export interface FieldOption { id: string; label: string; sortOrder: number; active: boolean }
export interface FormFieldDef {
  id: string; label: string; type: FieldType; required: boolean; sortOrder: number; showInReport: boolean;
  config: { unit?: string; min?: number; max?: number; maxLength?: number; allowNote?: boolean; notePlaceholder?: string; legacyKey?: string };
  options: FieldOption[];
}
export interface FormSectionDef { id: string; title: string; sortOrder: number; fields: FormFieldDef[] }

/** In-progress answer for one field, shaped per type — same contract the backend's record-values.ts expects. */
export type ChecklistDraft = { done: boolean; urgent: boolean; later: boolean; note: string };
export type FieldValue =
  | { type: 'CHECKLIST'; v: ChecklistDraft }
  | { type: 'SINGLE_CHOICE' | 'DROPDOWN'; v: string }
  | { type: 'MULTI_CHOICE'; v: string[] }
  | { type: 'TEXT' | 'TEXTAREA'; v: string }
  | { type: 'NUMBER'; v: string };

export const emptyValueFor = (type: FieldType): FieldValue => {
  switch (type) {
    case 'CHECKLIST': return { type, v: { done: false, urgent: false, later: false, note: '' } };
    case 'SINGLE_CHOICE': case 'DROPDOWN': return { type, v: '' };
    case 'MULTI_CHOICE': return { type, v: [] };
    case 'TEXT': case 'TEXTAREA': return { type, v: '' };
    case 'NUMBER': return { type, v: '' };
  }
};

/** Converts a draft into the wire shape for POST/PATCH /records, or undefined to omit an untouched field. */
export function toWireValue(fv: FieldValue): unknown {
  switch (fv.type) {
    case 'CHECKLIST': {
      const { done, urgent, later, note } = fv.v;
      if (!done && !urgent && !later && !note.trim()) return undefined;
      return { done, urgent, later, ...(note.trim() ? { note: note.trim() } : {}) };
    }
    case 'SINGLE_CHOICE': case 'DROPDOWN':
      return fv.v ? fv.v : undefined;
    case 'MULTI_CHOICE':
      return fv.v.length ? fv.v : undefined;
    case 'TEXT': case 'TEXTAREA':
      return fv.v.trim() ? fv.v.trim() : undefined;
    case 'NUMBER':
      return fv.v.trim() !== '' ? fv.v.trim() : undefined;
  }
}
