import { ArrowDown, ArrowUp, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../../app/hooks';
import { resolveLabel } from '../../../../lib/i18n/resolveLabel';
import type { BuilderSection } from '../types';
import { useFormBuilderActions } from '../useFormBuilderActions';
import { BilingualInput } from './BilingualInput';
import { FieldEditor } from './FieldEditor';
import { NewFieldForm } from './NewFieldForm';

export function SectionEditor({ section, isFirst, isLast, onMove }: { section: BuilderSection; isFirst: boolean; isLast: boolean; onMove: (dir: -1 | 1) => void }) {
  const { t, i18n } = useTranslation();
  const actions = useFormBuilderActions();
  const busy = useAppSelector((s) => s.formBuilder.busy);
  const rowError = useAppSelector((s) => s.formBuilder.rowError);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ en: section.titleEn, it: section.titleIt ?? '' });

  const fields = [...section.fields].sort((a, b) => a.sortOrder - b.sortOrder);

  const startEdit = () => { setDraft({ en: section.titleEn, it: section.titleIt ?? '' }); setEditing(true); };
  const save = async () => {
    const res = await actions.updateSection({ id: section.id, titleEn: draft.en.trim(), titleIt: draft.it.trim() || null });
    if (res.meta.requestStatus === 'fulfilled') setEditing(false);
  };
  const moveField = (fieldId: string, dir: -1 | 1) => {
    const ids = fields.map((f) => f.id);
    const idx = ids.indexOf(fieldId);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    actions.reorderFields(section.id, ids);
  };

  return (
    <div className="panel p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
        {editing ? (
          <div className="flex-1 space-y-2">
            <BilingualInput en={draft.en} it={draft.it} onEnChange={(v) => setDraft((d) => ({ ...d, en: v }))} onItChange={(v) => setDraft((d) => ({ ...d, it: v }))} enLabel={t('builder.titleEnLabel')} itLabel={t('builder.titleItLabel')} />
            <div className="flex items-center gap-2">
              <button className="btn-primary text-sm" onClick={save} disabled={busy[section.id]}>
                {busy[section.id] && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t('builder.save')}
              </button>
              <button className="btn-ghost text-sm" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /> {t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <h2 className={`text-lg ${section.active ? '' : 'text-muted line-through'}`}>
            {resolveLabel(i18n.language, section.titleEn, section.titleIt)}
          </h2>
        )}
        {!editing && (
          <div className="flex items-center gap-1 flex-wrap sm:shrink-0">
            <button className="text-muted hover:text-ink disabled:opacity-30" disabled={isFirst} onClick={() => onMove(-1)} aria-label={t('builder.moveUp')}><ArrowUp className="h-4 w-4" /></button>
            <button className="text-muted hover:text-ink disabled:opacity-30" disabled={isLast} onClick={() => onMove(1)} aria-label={t('builder.moveDown')}><ArrowDown className="h-4 w-4" /></button>
            <button className="btn-ghost !p-1.5" onClick={startEdit}><Pencil className="h-4 w-4" /></button>
            <button
              className="btn-ghost !p-1.5"
              disabled={busy[section.id]}
              onClick={() => actions.updateSection({ id: section.id, active: !section.active })}
            >
              {section.active ? t('builder.deactivate') : t('builder.activate')}
            </button>
            <button
              className="btn-ghost !p-1.5 hover:!text-rust"
              disabled={busy[section.id]}
              onClick={() => { if (window.confirm(t('builder.confirmDeleteSection'))) actions.deleteSection(section.id); }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {rowError[section.id] && <p className="text-sm text-rust mb-2">{rowError[section.id]}</p>}

      {fields.length === 0 && <p className="text-sm text-muted py-2">{t('builder.noFields')}</p>}
      <div className="divide-y divide-steel">
        {fields.map((field, idx) => (
          <FieldEditor key={field.id} field={field} isFirst={idx === 0} isLast={idx === fields.length - 1} onMove={(dir) => moveField(field.id, dir)} />
        ))}
      </div>

      <NewFieldForm sectionId={section.id} />
    </div>
  );
}
