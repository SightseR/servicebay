import { ArrowDown, ArrowUp, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../../app/hooks';
import { resolveLabel } from '../../../../lib/i18n/resolveLabel';
import { CHOICE_TYPES } from '../types';
import type { BuilderField, FieldConfig, FieldType } from '../types';
import { useFormBuilderActions } from '../useFormBuilderActions';
import { BilingualInput } from './BilingualInput';
import { ConfigFields } from './ConfigFields';
import { FieldTypeBadge, FieldTypeSelect } from './FieldTypeBadge';
import { OptionEditor } from './OptionEditor';

export function FieldEditor({ field, isFirst, isLast, onMove }: { field: BuilderField; isFirst: boolean; isLast: boolean; onMove: (dir: -1 | 1) => void }) {
  const { t, i18n } = useTranslation();
  const actions = useFormBuilderActions();
  const busy = useAppSelector((s) => s.formBuilder.busy);
  const rowError = useAppSelector((s) => s.formBuilder.rowError);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    en: field.labelEn, it: field.labelIt ?? '', type: field.type as FieldType,
    required: field.required, showInReport: field.showInReport, config: field.config as FieldConfig,
  });

  const isChoice = CHOICE_TYPES.includes(field.type);

  const startEdit = () => {
    setDraft({ en: field.labelEn, it: field.labelIt ?? '', type: field.type, required: field.required, showInReport: field.showInReport, config: field.config });
    setEditing(true);
  };
  const save = async () => {
    const res = await actions.updateField({
      id: field.id, labelEn: draft.en.trim(), labelIt: draft.it.trim() || null,
      type: draft.type !== field.type ? draft.type : undefined,
      required: draft.required, showInReport: draft.showInReport, config: draft.config,
    });
    if (res.meta.requestStatus === 'fulfilled') setEditing(false);
  };

  if (editing) {
    return (
      <div className="py-3 space-y-3 bg-panel-alt/40 -mx-4 px-4">
        <BilingualInput en={draft.en} it={draft.it} onEnChange={(v) => setDraft((d) => ({ ...d, en: v }))} onItChange={(v) => setDraft((d) => ({ ...d, it: v }))} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">{t('builder.fieldType')}</span>
            <FieldTypeSelect value={draft.type} onChange={(type) => setDraft((d) => ({ ...d, type, config: {} }))} />
            <span className="text-xs text-muted">{t('builder.changeType')}</span>
          </label>
          <div className="flex items-end gap-4 pb-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.required} onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))} /> {t('builder.required')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.showInReport} onChange={(e) => setDraft((d) => ({ ...d, showInReport: e.target.checked }))} /> {t('builder.showInReport')}</label>
          </div>
        </div>
        <ConfigFields type={draft.type} config={draft.config} onChange={(config) => setDraft((d) => ({ ...d, config }))} />
        {rowError[field.id] && <p className="text-sm text-rust">{rowError[field.id]}</p>}
        <div className="flex items-center gap-2">
          <button className="btn-primary text-sm" onClick={save} disabled={busy[field.id]}>
            {busy[field.id] && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t('builder.save')}
          </button>
          <button className="btn-ghost text-sm" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /> {t('common.cancel')}</button>
        </div>
        {isChoice && <OptionEditor fieldId={field.id} options={field.options} />}
      </div>
    );
  }

  return (
    <div className="py-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <span className={`text-sm truncate ${field.active ? 'text-ink' : 'text-muted line-through'}`}>
            {resolveLabel(i18n.language, field.labelEn, field.labelIt)}
          </span>
          <FieldTypeBadge type={field.type} />
          {field.required && <span className="text-xs text-muted">*</span>}
        </div>
        <div className="flex items-center gap-1 flex-wrap sm:shrink-0">
          <button className="text-muted hover:text-ink disabled:opacity-30" disabled={isFirst} onClick={() => onMove(-1)} aria-label={t('builder.moveUp')}><ArrowUp className="h-3.5 w-3.5" /></button>
          <button className="text-muted hover:text-ink disabled:opacity-30" disabled={isLast} onClick={() => onMove(1)} aria-label={t('builder.moveDown')}><ArrowDown className="h-3.5 w-3.5" /></button>
          <button className="btn-ghost !p-1.5" onClick={startEdit}><Pencil className="h-3.5 w-3.5" /></button>
          <button
            className="btn-ghost !p-1.5"
            disabled={busy[field.id]}
            onClick={() => actions.updateField({ id: field.id, active: !field.active })}
          >
            {field.active ? t('builder.deactivate') : t('builder.activate')}
          </button>
          <button
            className="btn-ghost !p-1.5 hover:!text-rust"
            disabled={busy[field.id]}
            onClick={() => { if (window.confirm(t('builder.confirmDeleteField'))) actions.deleteField(field.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {rowError[field.id] && <p className="text-xs text-rust mt-1">{rowError[field.id]}</p>}
    </div>
  );
}
