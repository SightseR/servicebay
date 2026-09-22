import { Loader2, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../../app/hooks';
import { CHOICE_TYPES } from '../types';
import type { FieldConfig, FieldType } from '../types';
import { useFormBuilderActions } from '../useFormBuilderActions';
import { BilingualInput } from './BilingualInput';
import { ConfigFields } from './ConfigFields';
import { FieldTypeSelect } from './FieldTypeBadge';

export function NewFieldForm({ sectionId }: { sectionId: string }) {
  const { t } = useTranslation();
  const actions = useFormBuilderActions();
  const busy = useAppSelector((s) => s.formBuilder.busy[sectionId]);
  const [open, setOpen] = useState(false);
  const [en, setEn] = useState('');
  const [it, setIt] = useState('');
  const [type, setType] = useState<FieldType>('CHECKLIST');
  const [required, setRequired] = useState(false);
  const [showInReport, setShowInReport] = useState(true);
  const [config, setConfig] = useState<FieldConfig>({});
  const [options, setOptions] = useState<{ en: string; it: string }[]>([{ en: '', it: '' }]);
  const [error, setError] = useState<string | null>(null);

  const isChoice = CHOICE_TYPES.includes(type);
  const reset = () => {
    setEn(''); setIt(''); setType('CHECKLIST'); setRequired(false); setShowInReport(true); setConfig({}); setOptions([{ en: '', it: '' }]); setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!en.trim()) { setError(t('builder.labelEnLabel')); return; }
    const cleanOptions = options.map((o) => ({ en: o.en.trim(), it: o.it.trim() })).filter((o) => o.en);
    if (isChoice && cleanOptions.length === 0) { setError(t('builder.needAtLeastOneOption')); return; }

    const res = await actions.createField({
      sectionId, labelEn: en.trim(), labelIt: it.trim() || null, type, required, showInReport, config,
      options: isChoice ? cleanOptions.map((o) => ({ labelEn: o.en, labelIt: o.it || null })) : undefined,
    });
    if (res.meta.requestStatus === 'fulfilled') { reset(); setOpen(false); }
  };

  if (!open) {
    return (
      <button className="mt-2 flex items-center gap-1.5 text-sm text-amber hover:underline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t('builder.addField')}
      </button>
    );
  }

  return (
    <div className="mt-3 panel !bg-panel-alt p-4 space-y-3">
      <BilingualInput en={en} it={it} onEnChange={setEn} onItChange={setIt} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">{t('builder.fieldType')}</span>
          <FieldTypeSelect value={type} onChange={(v) => { setType(v); setConfig({}); }} />
        </label>
        <div className="flex items-end gap-4 pb-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> {t('builder.required')}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showInReport} onChange={(e) => setShowInReport(e.target.checked)} /> {t('builder.showInReport')}</label>
        </div>
      </div>
      <ConfigFields type={type} config={config} onChange={setConfig} />

      {isChoice && (
        <div>
          <p className="field-label">{t('builder.options')}</p>
          <div className="space-y-2">
            {options.map((o, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <BilingualInput
                    en={o.en} it={o.it} size="sm"
                    enLabel={t('builder.optionEn')} itLabel={t('builder.optionIt')}
                    onEnChange={(v) => setOptions((prev) => prev.map((p, i) => (i === idx ? { ...p, en: v } : p)))}
                    onItChange={(v) => setOptions((prev) => prev.map((p, i) => (i === idx ? { ...p, it: v } : p)))}
                  />
                </div>
                {options.length > 1 && (
                  <button className="text-muted hover:text-rust mt-5" onClick={() => setOptions((prev) => prev.filter((_, i) => i !== idx))}><X className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </div>
          <button className="mt-2 text-xs text-amber hover:underline" onClick={() => setOptions((prev) => [...prev, { en: '', it: '' }])}>
            + {t('builder.addOption')}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}
      <div className="flex items-center gap-2">
        <button className="btn-primary text-sm" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t('builder.addField')}
        </button>
        <button className="btn-ghost text-sm" onClick={() => { reset(); setOpen(false); }}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}
