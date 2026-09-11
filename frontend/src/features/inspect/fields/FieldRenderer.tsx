import type { FieldValue, FormFieldDef } from '../types';
import { ChecklistField } from './ChecklistField';
import { ChoiceField } from './ChoiceField';
import { MultiChoiceField } from './MultiChoiceField';
import { NumberField } from './NumberField';
import { TextField } from './TextField';

export function FieldRenderer({ field, value, onChange }: { field: FormFieldDef; value: FieldValue; onChange: (v: FieldValue) => void }) {
  switch (value.type) {
    case 'CHECKLIST':
      return <ChecklistField field={field} value={value.v} onChange={(v) => onChange({ type: 'CHECKLIST', v })} />;
    case 'SINGLE_CHOICE': case 'DROPDOWN':
      return <ChoiceField field={field} value={value.v} onChange={(v) => onChange({ type: value.type, v })} />;
    case 'MULTI_CHOICE':
      return <MultiChoiceField field={field} value={value.v} onChange={(v) => onChange({ type: 'MULTI_CHOICE', v })} />;
    case 'TEXT': case 'TEXTAREA':
      return <TextField field={field} value={value.v} onChange={(v) => onChange({ type: value.type, v })} />;
    case 'NUMBER':
      return <NumberField field={field} value={value.v} onChange={(v) => onChange({ type: 'NUMBER', v })} />;
  }
}
