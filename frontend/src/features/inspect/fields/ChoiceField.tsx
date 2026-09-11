import { useTranslation } from 'react-i18next';
import { resolveLabel } from '../../../lib/i18n/resolveLabel';
import type { FormFieldDef } from '../types';

export function ChoiceField({ field, value, onChange }: { field: FormFieldDef; value: string; onChange: (v: string) => void }) {
  const { t, i18n } = useTranslation();
  const label = resolveLabel(i18n.language, field.labelEn, field.labelIt);

  if (field.type === 'DROPDOWN') {
    return (
      <label className="block py-2">
        <span className="text-sm text-muted block mb-1">{label}{field.required && ' *'}</span>
        <select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{t('common.select')}</option>
          {field.options.filter((o) => o.active).map((o) => (
            <option key={o.id} value={o.id}>{resolveLabel(i18n.language, o.labelEn, o.labelIt)}</option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div className="py-2">
      <span className="text-sm text-muted block mb-1.5">{label}{field.required && ' *'}</span>
      <div className="flex flex-wrap gap-1.5">
        {field.options.filter((o) => o.active).map((o) => (
          <button
            key={o.id}
            type="button"
            className={`px-3 py-1.5 rounded-sm border text-sm transition-colors ${value === o.id ? 'border-amber text-amber bg-amber/10' : 'border-steel-light text-muted hover:text-ink'}`}
            onClick={() => onChange(value === o.id ? '' : o.id)}
          >
            {resolveLabel(i18n.language, o.labelEn, o.labelIt)}
          </button>
        ))}
      </div>
    </div>
  );
}
