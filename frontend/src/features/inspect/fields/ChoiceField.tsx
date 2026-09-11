import type { FormFieldDef } from '../types';

export function ChoiceField({ field, value, onChange }: { field: FormFieldDef; value: string; onChange: (v: string) => void }) {
  if (field.type === 'DROPDOWN') {
    return (
      <label className="block py-2">
        <span className="text-sm text-muted block mb-1">{field.labelEn}{field.required && ' *'}</span>
        <select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{field.config.legacyKey ? 'Select…' : '—'}</option>
          {field.options.filter((o) => o.active).map((o) => <option key={o.id} value={o.id}>{o.labelEn}</option>)}
        </select>
      </label>
    );
  }
  return (
    <div className="py-2">
      <span className="text-sm text-muted block mb-1.5">{field.labelEn}{field.required && ' *'}</span>
      <div className="flex flex-wrap gap-1.5">
        {field.options.filter((o) => o.active).map((o) => (
          <button
            key={o.id}
            type="button"
            className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${value === o.id ? 'border-amber text-amber bg-amber/10' : 'border-steel-light text-muted hover:text-ink'}`}
            onClick={() => onChange(value === o.id ? '' : o.id)}
          >
            {o.labelEn}
          </button>
        ))}
      </div>
    </div>
  );
}
