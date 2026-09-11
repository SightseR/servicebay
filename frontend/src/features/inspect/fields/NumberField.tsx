import type { FormFieldDef } from '../types';

export function NumberField({ field, value, onChange }: { field: FormFieldDef; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block py-2">
      <span className="text-sm text-muted block mb-1">
        {field.labelEn}{field.required && ' *'}{field.config.unit && <span className="text-muted"> ({field.config.unit})</span>}
      </span>
      <input
        type="number"
        className="field-input"
        min={field.config.min}
        max={field.config.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
