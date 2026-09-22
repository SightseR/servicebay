import { useTranslation } from 'react-i18next';
import { TextInput } from '../../../../components/FormField';
import type { FieldConfig, FieldType } from '../types';

/** Type-specific settings, matching the shapes field-config.ts validates on the backend. */
export function ConfigFields({ type, config, onChange }: { type: FieldType; config: FieldConfig; onChange: (c: FieldConfig) => void }) {
  const { t } = useTranslation();
  const set = <K extends keyof FieldConfig>(k: K, v: FieldConfig[K]) => onChange({ ...config, [k]: v });
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

  if (type === 'CHECKLIST') {
    return (
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={!!config.allowNote} onChange={(e) => set('allowNote', e.target.checked)} />
        {t('builder.allowNote')}
      </label>
    );
  }
  if (type === 'NUMBER') {
    return (
      <div className="grid grid-cols-3 gap-3">
        <label className="block"><span className="field-label">{t('builder.unit')}</span><TextInput value={config.unit ?? ''} onChange={(e) => set('unit', e.target.value || undefined)} /></label>
        <label className="block"><span className="field-label">{t('builder.min')}</span><TextInput type="number" value={config.min ?? ''} onChange={(e) => set('min', num(e.target.value))} /></label>
        <label className="block"><span className="field-label">{t('builder.max')}</span><TextInput type="number" value={config.max ?? ''} onChange={(e) => set('max', num(e.target.value))} /></label>
      </div>
    );
  }
  if (type === 'TEXT' || type === 'TEXTAREA') {
    return (
      <label className="block max-w-xs">
        <span className="field-label">{t('builder.maxLength')}</span>
        <TextInput type="number" value={config.maxLength ?? ''} onChange={(e) => set('maxLength', num(e.target.value))} />
      </label>
    );
  }
  return null;
}
