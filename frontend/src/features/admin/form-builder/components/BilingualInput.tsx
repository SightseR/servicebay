import { useTranslation } from 'react-i18next';
import { TextInput } from '../../../../components/FormField';

/** The "two boxes" the client asked for — every admin-authored name is entered as EN + optional IT. */
export function BilingualInput({
  en, it, onEnChange, onItChange, enLabel, itLabel, size = 'md',
}: {
  en: string; it: string; onEnChange: (v: string) => void; onItChange: (v: string) => void;
  enLabel?: string; itLabel?: string; size?: 'sm' | 'md';
}) {
  const { t } = useTranslation();
  const cls = size === 'sm' ? '!py-1.5 text-sm' : '';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="block">
        <span className="field-label">{enLabel ?? t('builder.labelEnLabel')}</span>
        <TextInput className={cls} value={en} onChange={(e) => onEnChange(e.target.value)} />
      </label>
      <label className="block">
        <span className="field-label">{itLabel ?? t('builder.labelItLabel')}</span>
        <TextInput className={cls} value={it} onChange={(e) => onItChange(e.target.value)} />
      </label>
    </div>
  );
}
