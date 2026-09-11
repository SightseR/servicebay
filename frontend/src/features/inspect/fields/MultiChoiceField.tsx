import { useTranslation } from 'react-i18next';
import { resolveLabel } from '../../../lib/i18n/resolveLabel';
import type { FormFieldDef } from '../types';

export function MultiChoiceField({ field, value, onChange }: { field: FormFieldDef; value: string[]; onChange: (v: string[]) => void }) {
  const { i18n } = useTranslation();
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="py-2">
      <span className="text-sm text-muted block mb-1.5">{resolveLabel(i18n.language, field.labelEn, field.labelIt)}{field.required && ' *'}</span>
      <div className="flex flex-wrap gap-1.5">
        {field.options.filter((o) => o.active).map((o) => (
          <button
            key={o.id}
            type="button"
            className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${value.includes(o.id) ? 'border-amber text-amber bg-amber/10' : 'border-steel-light text-muted hover:text-ink'}`}
            onClick={() => toggle(o.id)}
          >
            {resolveLabel(i18n.language, o.labelEn, o.labelIt)}
          </button>
        ))}
      </div>
    </div>
  );
}
