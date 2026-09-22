import { Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../../../app/hooks';
import { Alert } from '../../../../components/Alert';
import { Spinner } from '../../../../components/Spinner';
import { fetchDefinition } from '../formBuilderSlice';
import { useFormBuilderActions } from '../useFormBuilderActions';
import { BilingualInput } from '../components/BilingualInput';
import { SectionEditor } from '../components/SectionEditor';

export function FormBuilderPage() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const actions = useFormBuilderActions();
  const { sections, loading, error, busy } = useAppSelector((s) => s.formBuilder);
  const [adding, setAdding] = useState(false);
  const [en, setEn] = useState('');
  const [it, setIt] = useState('');

  useEffect(() => { dispatch(fetchDefinition()); }, [dispatch]);

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  const moveSection = (sectionId: string, dir: -1 | 1) => {
    const ids = sorted.map((s) => s.id);
    const idx = ids.indexOf(sectionId);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    actions.reorderSections(ids);
  };

  const submitNewSection = async () => {
    if (!en.trim()) return;
    const res = await actions.createSection({ titleEn: en.trim(), titleIt: it.trim() || null });
    if (res.meta.requestStatus === 'fulfilled') { setEn(''); setIt(''); setAdding(false); }
  };

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <h1 className="text-2xl mb-1">{t('builder.title')}</h1>
      <p className="text-muted mb-6">{t('builder.subtitle')}</p>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading && sections.length === 0 && (
        <div className="flex items-center gap-2 text-muted py-8"><Spinner className="h-4 w-4" /> {t('common.loading')}</div>
      )}

      <div className="space-y-4">
        {sorted.map((section, idx) => (
          <SectionEditor key={section.id} section={section} isFirst={idx === 0} isLast={idx === sorted.length - 1} onMove={(dir) => moveSection(section.id, dir)} />
        ))}
      </div>

      <div className="mt-6">
        {adding ? (
          <div className="panel p-4 space-y-3">
            <BilingualInput en={en} it={it} onEnChange={setEn} onItChange={setIt} enLabel={t('builder.titleEnLabel')} itLabel={t('builder.titleItLabel')} />
            <div className="flex items-center gap-2">
              <button className="btn-primary text-sm" onClick={submitNewSection} disabled={busy.__new_section}>
                {busy.__new_section && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t('builder.createSection')}
              </button>
              <button className="btn-ghost text-sm" onClick={() => { setAdding(false); setEn(''); setIt(''); }}>{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <button className="btn-ghost" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> {t('builder.newSection')}
          </button>
        )}
      </div>
    </div>
  );
}
