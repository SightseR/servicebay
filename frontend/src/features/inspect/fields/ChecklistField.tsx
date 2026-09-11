import type { ChecklistDraft, FormFieldDef } from '../types';

const chip = (active: boolean, tone: 'moss' | 'rust' | 'amber') => {
  const base = 'px-2.5 py-1 rounded-sm border text-xs transition-colors';
  if (!active) return `${base} border-steel-light text-muted hover:border-steel-light hover:text-ink`;
  return { moss: `${base} border-moss text-moss bg-moss/10`, rust: `${base} border-rust text-rust bg-rust/10`, amber: `${base} border-amber text-amber bg-amber/10` }[tone];
};

export function ChecklistField({ field, value, onChange }: { field: FormFieldDef; value: ChecklistDraft; onChange: (v: ChecklistDraft) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-ink text-sm">{field.labelEn}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" className={chip(value.done, 'moss')} onClick={() => onChange({ ...value, done: !value.done })}>Done</button>
        <button type="button" className={chip(value.urgent, 'rust')} onClick={() => onChange({ ...value, urgent: !value.urgent })}>Urgent</button>
        <button type="button" className={chip(value.later, 'amber')} onClick={() => onChange({ ...value, later: !value.later })}>Later</button>
        {field.config.allowNote && (
          <input
            className="field-input !w-40 !py-1 text-sm"
            placeholder={field.config.notePlaceholder ?? 'Note'}
            value={value.note}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}
