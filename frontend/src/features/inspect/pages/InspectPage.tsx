import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Alert } from '../../../components/Alert';
import { Spinner } from '../../../components/Spinner';
import { apiFetch, ApiError } from '../../../lib/apiClient';
import { resolveLabel } from '../../../lib/i18n/resolveLabel';
import { VehiclePicker, isVehicleSelectionValid } from '../components/VehiclePicker';
import type { VehicleSelection } from '../components/VehiclePicker';
import { FieldRenderer } from '../fields/FieldRenderer';
import { fetchFormDefinition } from '../formDefinitionSlice';
import { emptyValueFor, toWireValue } from '../types';
import type { FieldValue } from '../types';

interface CreatedRecord { id: string }
interface FieldErrorBody { message: string; errors?: { fieldId: string; label: string; message: string }[] }

export function InspectPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { sections, loading, error } = useAppSelector((s) => s.formDefinition);

  const [vehicle, setVehicle] = useState<VehicleSelection>(null);
  const [kilometers, setKilometers] = useState('');
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => { dispatch(fetchFormDefinition()); }, [dispatch]);

  const allFields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);

  const setFieldValue = (fieldId: string, v: FieldValue) => {
    setValues((prev) => ({ ...prev, [fieldId]: v }));
    setFieldErrors((prev) => { const { [fieldId]: _drop, ...rest } = prev; return rest; });
  };
  const valueFor = (field: (typeof allFields)[number]): FieldValue => values[field.id] ?? emptyValueFor(field.type);

  const onSubmit = async () => {
    setFormError(null);
    if (!isVehicleSelectionValid(vehicle)) { setFormError(t('inspect.vehicleRequired')); return; }

    const wireValues = allFields
      .map((f) => ({ fieldId: f.id, value: toWireValue(valueFor(f)) }))
      .filter((v): v is { fieldId: string; value: unknown } => v.value !== undefined);

    const body: Record<string, unknown> = {
      ...(vehicle!.kind === 'existing' ? { vehicleId: vehicle!.vehicle.id } : {
        vehicle: {
          regNumber: vehicle!.draft.regNumber, brand: vehicle!.draft.brand, model: vehicle!.draft.model,
          ...(vehicle!.draft.year ? { year: Number(vehicle!.draft.year) } : {}),
          ...(vehicle!.draft.gearbox ? { gearbox: vehicle!.draft.gearbox } : {}),
          ...(vehicle!.draft.motivePower ? { motivePower: vehicle!.draft.motivePower } : {}),
          ...(vehicle!.draft.driveMode ? { driveMode: vehicle!.draft.driveMode } : {}),
          ...(vehicle!.draft.ownerName ? { ownerName: vehicle!.draft.ownerName } : {}),
          ...(vehicle!.draft.ownerPhone ? { ownerPhone: vehicle!.draft.ownerPhone } : {}),
          ...(vehicle!.draft.ownerEmail ? { ownerEmail: vehicle!.draft.ownerEmail } : {}),
        },
      }),
      ...(kilometers.trim() ? { kilometers: Number(kilometers.trim()) } : {}),
      values: wireValues,
    };

    setSubmitting(true);
    try {
      const created = await apiFetch<CreatedRecord>('/records', { method: 'POST', body });
      navigate('/', { state: { justCreated: created.id } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        const body2 = e.body as FieldErrorBody;
        if (body2.errors?.length) {
          setFieldErrors(Object.fromEntries(body2.errors.map((er) => [er.fieldId, er.message])));
          setFormError(t('inspect.fixFields'));
        } else {
          setFormError(body2.message ?? t('inspect.genericError'));
        }
      } else {
        setFormError(e instanceof ApiError ? e.message : t('inspect.genericError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && sections.length === 0) {
    return <div className="p-8 flex items-center gap-2 text-muted"><Spinner className="h-4 w-4" /> {t('common.loading')}</div>;
  }
  if (error) return <div className="p-8"><Alert>{error}</Alert></div>;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl mb-1">{t('inspect.title')}</h1>
      <p className="text-muted mb-6">{t('inspect.subtitle')}</p>

      {formError && <div className="mb-4"><Alert>{formError}</Alert></div>}

      <div className="space-y-6">
        <VehiclePicker selection={vehicle} onChange={setVehicle} />

        {isVehicleSelectionValid(vehicle) && (
          <>
            <label className="block max-w-xs">
              <span className="field-label">{t('inspect.mileage')}</span>
              <input type="number" className="field-input" value={kilometers} onChange={(e) => setKilometers(e.target.value)} />
            </label>

            {sections.map((section) => (
              <div key={section.id} className="panel p-4">
                <h2 className="text-lg mb-1">{resolveLabel(i18n.language, section.titleEn, section.titleIt)}</h2>
                <div className="divide-y divide-steel">
                  {section.fields.map((field) => (
                    <div key={field.id}>
                      <FieldRenderer field={field} value={valueFor(field)} onChange={(v) => setFieldValue(field.id, v)} />
                      {fieldErrors[field.id] && (
                        <p className="flex items-center gap-1.5 text-sm text-rust pb-2 -mt-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> {fieldErrors[field.id]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <button className="btn-primary" disabled={submitting} onClick={onSubmit}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('inspect.save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
