import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../../lib/apiClient';
import { FormField, TextInput } from '../../../components/FormField';
import { Plate } from '../../../components/Plate';
import { Spinner } from '../../../components/Spinner';
import { useDebouncedValue } from '../../../lib/hooks/useDebouncedValue';
import type { Gearbox, DriveMode, MotivePower, VehicleSummary } from '../../records/types';

export interface NewVehicleDraft {
  regNumber: string; brand: string; model: string; year: string;
  gearbox: Gearbox | ''; motivePower: MotivePower | ''; driveMode: DriveMode | '';
  ownerName: string; ownerPhone: string; ownerEmail: string;
}
export type VehicleSelection = { kind: 'existing'; vehicle: VehicleSummary } | { kind: 'new'; draft: NewVehicleDraft } | null;

const emptyDraft = (regNumber: string): NewVehicleDraft => ({
  regNumber, brand: '', model: '', year: '', gearbox: '', motivePower: '', driveMode: '', ownerName: '', ownerPhone: '', ownerEmail: '',
});

const POWER_KEYS: Record<MotivePower, string> = {
  PETROL: 'inspect.powerPetrol', DIESEL: 'inspect.powerDiesel', GAS: 'inspect.powerGas',
  HYBRID: 'inspect.powerHybrid', PHEV: 'inspect.powerPhev', HEV: 'inspect.powerHev',
};

export function VehiclePicker({ selection, onChange }: { selection: VehicleSelection; onChange: (s: VehicleSelection) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    if (selection || !debouncedQuery.trim()) { setNotFound(false); return; }
    let cancelled = false;
    setSearching(true);
    apiFetch<VehicleSummary | null>(`/vehicles/by-reg/${encodeURIComponent(debouncedQuery.trim())}`)
      .then((v) => {
        if (cancelled) return;
        setSearching(false);
        if (v) onChange({ kind: 'existing', vehicle: v });
        else setNotFound(true);
      })
      .catch(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selection]);

  if (selection?.kind === 'existing') {
    const v = selection.vehicle;
    return (
      <div className="panel p-4 flex items-center justify-between">
        <div>
          <Plate>{v.regNumber}</Plate>
          <p className="mt-1.5">{v.brand} {v.model}{v.year ? ` · ${v.year}` : ''}</p>
          {v.ownerName && <p className="text-sm text-muted">{v.ownerName}</p>}
        </div>
        <button type="button" className="btn-ghost text-sm" onClick={() => { onChange(null); setQuery(''); }}>{t('inspect.changeVehicle')}</button>
      </div>
    );
  }

  if (selection?.kind === 'new') {
    const d = selection.draft;
    const set = (k: keyof NewVehicleDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ kind: 'new', draft: { ...d, [k]: e.target.value } });
    return (
      <div className="panel p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plate>{d.regNumber}</Plate>
            <span className="text-sm text-muted">{t('inspect.newVehicle')}</span>
          </div>
          <button type="button" className="btn-ghost text-sm" onClick={() => { onChange(null); setQuery(''); }}>{t('inspect.changeVehicle')}</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('inspect.brand')}><TextInput required value={d.brand} onChange={set('brand')} /></FormField>
          <FormField label={t('inspect.model')}><TextInput required value={d.model} onChange={set('model')} /></FormField>
          <FormField label={t('inspect.year')}><TextInput type="number" value={d.year} onChange={set('year')} /></FormField>
          <FormField label={t('inspect.gearbox')}>
            <select className="field-input" value={d.gearbox} onChange={set('gearbox') as never}>
              <option value="">{t('common.none')}</option>
              <option value="AUTO">{t('inspect.gearboxAuto')}</option>
              <option value="MANUAL">{t('inspect.gearboxManual')}</option>
            </select>
          </FormField>
          <FormField label={t('inspect.motivePower')}>
            <select className="field-input" value={d.motivePower} onChange={set('motivePower') as never}>
              <option value="">{t('common.none')}</option>
              {(Object.keys(POWER_KEYS) as MotivePower[]).map((p) => <option key={p} value={p}>{t(POWER_KEYS[p])}</option>)}
            </select>
          </FormField>
          <FormField label={t('inspect.driveMode')}>
            <select className="field-input" value={d.driveMode} onChange={set('driveMode') as never}>
              <option value="">{t('common.none')}</option>
              <option value="FRONT">{t('inspect.driveFront')}</option>
              <option value="REAR">{t('inspect.driveRear')}</option>
              <option value="FOUR_WD">{t('inspect.driveFourWd')}</option>
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label={t('inspect.ownerName')}><TextInput value={d.ownerName} onChange={set('ownerName')} /></FormField>
          <FormField label={t('inspect.ownerPhone')}><TextInput value={d.ownerPhone} onChange={set('ownerPhone')} /></FormField>
          <FormField label={t('inspect.ownerEmail')}><TextInput type="email" value={d.ownerEmail} onChange={set('ownerEmail')} /></FormField>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          className="field-input pl-9"
          placeholder={t('inspect.regPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {searching && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />}
      </div>
      {notFound && (
        <div className="mt-3 flex items-center gap-3">
          <p className="text-sm text-muted">{t('inspect.notFound', { query: query.trim() })}</p>
          <button type="button" className="btn-ghost text-sm" onClick={() => onChange({ kind: 'new', draft: emptyDraft(query.trim()) })}>
            {t('inspect.registerNew')}
          </button>
        </div>
      )}
    </div>
  );
}

export const isVehicleSelectionValid = (s: VehicleSelection) =>
  s?.kind === 'existing' || (s?.kind === 'new' && s.draft.regNumber.trim() && s.draft.brand.trim() && s.draft.model.trim());
