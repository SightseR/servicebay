import { useTranslation } from 'react-i18next';
import { resolveLabel } from '../../../lib/i18n/resolveLabel';
import type { ChecklistDraft, FormFieldDef } from '../types';

const chip = (active: boolean, tone: 'moss' | 'rust' | 'amber') => {
  const base = 'px-2.5 py-1 rounded-sm border text-xs transition-colors';
  if (!active) return `${base} border-steel-light text-muted hover:border-steel-light hover:text-ink`;
  return { moss: `${base} border-moss text-moss bg-moss/10`, rust: `${base} border-rust text-rust bg-rust/10`, amber: `${base} border-amber text-amber bg-amber/10` }[tone];
};

export function ChecklistField({ field, value, onChange }: { field: FormFieldDef; value: ChecklistDraft; onChange: (v: ChecklistDraft) => void }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-ink text-sm">{resolveLabel(i18n.language, field.labelEn, field.labelIt)}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" className={chip(value.done, 'moss')} onClick={() => onChange({ ...value, done: !value.done })}>{t('field.done')}</button>
        <button type="button" className={chip(value.urgent, 'rust')} onClick={() => onChange({ ...value, urgent: !value.urgent })}>{t('field.urgent')}</button>
        <button type="button" className={chip(value.later, 'amber')} onClick={() => onChange({ ...value, later: !value.later })}>{t('field.later')}</button>
        {field.config.allowNote && (
          <input
            className="field-input !w-40 !py-1 text-sm"
            placeholder={field.config.notePlaceholder ?? t('field.note')}
            value={value.note}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}
