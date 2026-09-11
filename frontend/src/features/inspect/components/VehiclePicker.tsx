import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
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

export function VehiclePicker({ selection, onChange }: { selection: VehicleSelection; onChange: (s: VehicleSelection) => void }) {
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
        <button type="button" className="btn-ghost text-sm" onClick={() => { onChange(null); setQuery(''); }}>Change vehicle</button>
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
            <span className="text-sm text-muted">New vehicle</span>
          </div>
          <button type="button" className="btn-ghost text-sm" onClick={() => { onChange(null); setQuery(''); }}>Change vehicle</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Brand"><TextInput required value={d.brand} onChange={set('brand')} /></FormField>
          <FormField label="Model"><TextInput required value={d.model} onChange={set('model')} /></FormField>
          <FormField label="Year"><TextInput type="number" value={d.year} onChange={set('year')} /></FormField>
          <FormField label="Gearbox">
            <select className="field-input" value={d.gearbox} onChange={set('gearbox') as never}>
              <option value="">—</option><option value="AUTO">Auto</option><option value="MANUAL">Manual</option>
            </select>
          </FormField>
          <FormField label="Motive power">
            <select className="field-input" value={d.motivePower} onChange={set('motivePower') as never}>
              <option value="">—</option>
              {['PETROL', 'DIESEL', 'GAS', 'HYBRID', 'PHEV', 'HEV'].map((p) => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}
            </select>
          </FormField>
          <FormField label="Drive mode">
            <select className="field-input" value={d.driveMode} onChange={set('driveMode') as never}>
              <option value="">—</option><option value="FRONT">Front</option><option value="REAR">Rear</option><option value="FOUR_WD">4×4</option>
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Owner name"><TextInput value={d.ownerName} onChange={set('ownerName')} /></FormField>
          <FormField label="Owner phone"><TextInput value={d.ownerPhone} onChange={set('ownerPhone')} /></FormField>
          <FormField label="Owner email"><TextInput type="email" value={d.ownerEmail} onChange={set('ownerEmail')} /></FormField>
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
          placeholder="Enter registration number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {searching && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />}
      </div>
      {notFound && (
        <div className="mt-3 flex items-center gap-3">
          <p className="text-sm text-muted">No vehicle found for &ldquo;{query.trim()}&rdquo;.</p>
          <button type="button" className="btn-ghost text-sm" onClick={() => onChange({ kind: 'new', draft: emptyDraft(query.trim()) })}>
            Register as a new vehicle
          </button>
        </div>
      )}
    </div>
  );
}

export const isVehicleSelectionValid = (s: VehicleSelection) =>
  s?.kind === 'existing' || (s?.kind === 'new' && s.draft.regNumber.trim() && s.draft.brand.trim() && s.draft.model.trim());
