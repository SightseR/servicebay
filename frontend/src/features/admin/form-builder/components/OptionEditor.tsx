import { ArrowDown, ArrowUp, Check, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../../app/hooks';
import { resolveLabel } from '../../../../lib/i18n/resolveLabel';
import { useFormBuilderActions } from '../useFormBuilderActions';
import type { BuilderOption } from '../types';
import { BilingualInput } from './BilingualInput';

export function OptionEditor({ fieldId, options }: { fieldId: string; options: BuilderOption[] }) {
  const { t, i18n } = useTranslation();
  const actions = useFormBuilderActions();
  const busy = useAppSelector((s) => s.formBuilder.busy);
  const rowError = useAppSelector((s) => s.formBuilder.rowError);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ en: '', it: '' });
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState({ en: '', it: '' });

  const sorted = [...options].sort((a, b) => a.sortOrder - b.sortOrder);

  const startEdit = (o: BuilderOption) => { setEditingId(o.id); setDraft({ en: o.labelEn, it: o.labelIt ?? '' }); };
  const saveEdit = async () => {
    if (!editingId) return;
    const res = await actions.updateOption({ id: editingId, fieldId, labelEn: draft.en.trim(), labelIt: draft.it.trim() || null });
    if (res.meta.requestStatus === 'fulfilled') setEditingId(null);
  };
  const addOption = async () => {
    if (!newDraft.en.trim()) return;
    const res = await actions.createOption(fieldId, newDraft.en.trim(), newDraft.it.trim() || null);
    if (res.meta.requestStatus === 'fulfilled') { setAdding(false); setNewDraft({ en: '', it: '' }); }
  };
  const move = (index: number, dir: -1 | 1) => {
    const ids = sorted.map((o) => o.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    actions.reorderOptions(fieldId, ids);
  };

  return (
    <div className="mt-3 pl-4 border-l-2 border-steel">
      <p className="text-xs text-muted mb-2">{t('builder.options')}</p>
      <div className="space-y-1.5">
        {sorted.map((o, idx) => (
          <div key={o.id}>
            {editingId === o.id ? (
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <BilingualInput en={draft.en} it={draft.it} onEnChange={(v) => setDraft((d) => ({ ...d, en: v }))} onItChange={(v) => setDraft((d) => ({ ...d, it: v }))} enLabel={t('builder.optionEn')} itLabel={t('builder.optionIt')} size="sm" />
                </div>
                <button className="btn-ghost !p-1.5 mt-5" onClick={saveEdit} disabled={busy[o.id]}>{busy[o.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}</button>
                <button className="btn-ghost !p-1.5 mt-5" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 text-sm">
                <button className={`text-left flex-1 ${o.active ? 'text-ink' : 'text-muted line-through'}`} onClick={() => startEdit(o)}>
                  {resolveLabel(i18n.language, o.labelEn, o.labelIt)}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button className="text-muted hover:text-ink disabled:opacity-30" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label={t('builder.moveUp')}><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button className="text-muted hover:text-ink disabled:opacity-30" disabled={idx === sorted.length - 1} onClick={() => move(idx, 1)} aria-label={t('builder.moveDown')}><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button
                    className="text-muted hover:text-ink"
                    disabled={busy[o.id]}
                    onClick={() => actions.updateOption({ id: o.id, fieldId, active: !o.active })}
                  >
                    {o.active ? t('builder.deactivate') : t('builder.activate')}
                  </button>
                  <button
                    className="text-muted hover:text-rust"
                    disabled={busy[o.id]}
                    onClick={() => { if (window.confirm(t('builder.confirmDeleteOption'))) actions.deleteOption(o.id, fieldId); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            {rowError[o.id] && <p className="text-xs text-rust mt-0.5">{rowError[o.id]}</p>}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-2 flex items-start gap-2">
          <div className="flex-1">
            <BilingualInput en={newDraft.en} it={newDraft.it} onEnChange={(v) => setNewDraft((d) => ({ ...d, en: v }))} onItChange={(v) => setNewDraft((d) => ({ ...d, it: v }))} enLabel={t('builder.optionEn')} itLabel={t('builder.optionIt')} size="sm" />
          </div>
          <button className="btn-ghost !p-1.5 mt-5" onClick={addOption} disabled={busy[fieldId]}>{busy[fieldId] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}</button>
          <button className="btn-ghost !p-1.5 mt-5" onClick={() => { setAdding(false); setNewDraft({ en: '', it: '' }); }}><X className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <button className="mt-2 flex items-center gap-1 text-xs text-amber hover:underline" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3" /> {t('builder.addOption')}
        </button>
      )}
      {options.length === 0 && !adding && <p className="text-xs text-rust mt-1">{t('builder.needAtLeastOneOption')}</p>}
    </div>
  );
}
