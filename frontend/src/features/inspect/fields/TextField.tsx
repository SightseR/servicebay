import type { FormFieldDef } from '../types';

export function TextField({ field, value, onChange }: { field: FormFieldDef; value: string; onChange: (v: string) => void }) {
  const Comp = field.type === 'TEXTAREA' ? 'textarea' : 'input';
  return (
    <label className="block py-2">
      <span className="text-sm text-muted block mb-1">{field.labelEn}{field.required && ' *'}</span>
      <Comp
        className="field-input"
        rows={field.type === 'TEXTAREA' ? 3 : undefined}
        maxLength={field.config.maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
