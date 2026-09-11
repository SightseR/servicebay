import { useTranslation } from 'react-i18next';
import { resolveLabel } from '../../../lib/i18n/resolveLabel';
import type { FormFieldDef } from '../types';

export function TextField({ field, value, onChange }: { field: FormFieldDef; value: string; onChange: (v: string) => void }) {
  const { i18n } = useTranslation();
  const Comp = field.type === 'TEXTAREA' ? 'textarea' : 'input';
  return (
    <label className="block py-2">
      <span className="text-sm text-muted block mb-1">{resolveLabel(i18n.language, field.labelEn, field.labelIt)}{field.required && ' *'}</span>
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
