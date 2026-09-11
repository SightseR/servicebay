import { AlertTriangle, ArrowLeft, Loader2, Pencil, Printer, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Alert } from '../../../components/Alert';
import { Plate } from '../../../components/Plate';
import { Spinner } from '../../../components/Spinner';
import { formatDate } from '../../../lib/i18n/formatDate';
import { resolveLabel } from '../../../lib/i18n/resolveLabel';
import { FieldRenderer } from '../../inspect/fields/FieldRenderer';
import { fetchFormDefinition } from '../../inspect/formDefinitionSlice';
import { emptyValueFor, fromWireValue, toWireValue } from '../../inspect/types';
import type { FieldValue } from '../../inspect/types';
import { ValueDisplay } from '../components/ValueDisplay';
import { clearRecord, deleteRecord, fetchRecord, updateRecord } from '../recordSlice';

const ENUM_KEYS: Record<string, string> = {
  AUTO: 'inspect.gearboxAuto', MANUAL: 'inspect.gearboxManual',
  PETROL: 'inspect.powerPetrol', DIESEL: 'inspect.powerDiesel', GAS: 'inspect.powerGas',
  HYBRID: 'inspect.powerHybrid', PHEV: 'inspect.powerPhev', HEV: 'inspect.powerHev',
  FRONT: 'inspect.driveFront', REAR: 'inspect.driveRear', FOUR_WD: 'inspect.driveFourWd',
};
const specLabel = (t: TFunction, v: { gearbox: string | null; motivePower: string | null; driveMode: string | null }) =>
  [v.gearbox, v.motivePower, v.driveMode].filter((x): x is string => !!x).map((x) => t(ENUM_KEYS[x] ?? x)).join(' · ') || '—';

export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentUser = useAppSelector((s) => s.auth.user);
  const { current: record, loading, saving, error, fieldErrors } = useAppSelector((s) => s.record);
  const { sections: fullDefinition } = useAppSelector((s) => s.formDefinition);

  const [editing, setEditing] = useState(false);
  const [kilometers, setKilometers] = useState('');
  const [servicedAt, setServicedAt] = useState('');
  const [values, setValues] = useState<Record<string, FieldValue>>({});

  useEffect(() => {
    if (id) dispatch(fetchRecord(id));
    return () => { dispatch(clearRecord()); };
  }, [id, dispatch]);

  const allEditFields = useMemo(() => fullDefinition.flatMap((s) => s.fields), [fullDefinition]);

  const startEditing = () => {
    if (!record) return;
    dispatch(fetchFormDefinition({ includeInactive: true }));
    setKilometers(record.kilometers != null ? String(record.kilometers) : '');
    setServicedAt(record.servicedAt.slice(0, 10));
    const byField = Object.fromEntries(record.values.map((v) => [v.fieldId, v.value]));
    const fieldTypes = Object.fromEntries(record.sections.flatMap((s) => s.items).map((i) => [i.fieldId, i.type]));
    setValues(Object.fromEntries(Object.entries(byField).map(([fid, v]) => [fid, fromWireValue(fieldTypes[fid] as never, v)])));
    setEditing(true);
  };

  const setFieldValue = (fieldId: string, v: FieldValue) => setValues((prev) => ({ ...prev, [fieldId]: v }));
  const valueFor = (fieldId: string, type: FieldValue['type']) => values[fieldId] ?? emptyValueFor(type);

  const onSave = async () => {
    if (!record) return;
    const wireValues = allEditFields
      .map((f) => ({ fieldId: f.id, value: toWireValue(valueFor(f.id, f.type)) }))
      .filter((v): v is { fieldId: string; value: unknown } => v.value !== undefined);
    const res = await dispatch(updateRecord({
      id: record.id,
      kilometers: kilometers.trim() ? Number(kilometers.trim()) : null,
      servicedAt: servicedAt ? new Date(servicedAt).toISOString() : undefined,
      values: wireValues,
    }));
    if (updateRecord.fulfilled.match(res)) setEditing(false);
  };

  const onDelete = async () => {
    if (!record || !window.confirm(t('record.confirmDelete'))) return;
    const res = await dispatch(deleteRecord(record.id));
    if (deleteRecord.fulfilled.match(res)) navigate('/');
  };

  if (loading && !record) return <div className="p-8 flex items-center gap-2 text-muted"><Spinner className="h-4 w-4" /> {t('common.loading')}</div>;
  if (error && !record) return <div className="p-8"><Alert>{error}</Alert></div>;
  if (!record) return null;

  const canDelete = currentUser?.role === 'MANAGER' || currentUser?.id === record.createdBy?.id;

  return (
    <div className="p-8 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4">
        <ArrowLeft className="h-4 w-4" /> {t('record.backToRecords')}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Plate>{record.vehicle.regNumber}</Plate>
            {record.legacyId && <span className="text-xs text-muted">{t('record.importedRecord')}</span>}
          </div>
          <h1 className="text-2xl">{record.vehicle.brand} {record.vehicle.model}{record.vehicle.year ? ` · ${record.vehicle.year}` : ''}</h1>
          <p className="text-muted text-sm mt-1">{specLabel(t, record)} · {t('record.servicedOn').toLowerCase()} {formatDate(i18n.language, record.servicedAt)}</p>
          {record.createdBy && (
            <p className="text-muted text-sm">
              {t('record.recordedBy', { name: record.createdBy.displayName })}
              {record.updatedBy && record.updatedBy.id !== record.createdBy.id ? t('record.lastEditedBy', { name: record.updatedBy.displayName }) : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editing && (
            <>
              <a href={`/records/${record.id}/print`} target="_blank" rel="noreferrer" className="btn-ghost">
                <Printer className="h-4 w-4" /> {t('record.print')}
              </a>
              <button className="btn-ghost" onClick={startEditing}><Pencil className="h-4 w-4" /> {t('record.edit')}</button>
              {canDelete && (
                <button className="btn-danger" onClick={onDelete} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} {t('record.delete')}
                </button>
              )}
            </>
          )}
          {editing && (
            <>
              <button className="btn-ghost" onClick={() => setEditing(false)} disabled={saving}><X className="h-4 w-4" /> {t('common.cancel')}</button>
              <button className="btn-primary" onClick={onSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} {t('record.saveChanges')}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      {editing ? (
        <div className="space-y-6">
          <div className="panel p-4 grid grid-cols-2 gap-4 max-w-md">
            <label className="block">
              <span className="field-label">{t('inspect.mileage')}</span>
              <input type="number" className="field-input" value={kilometers} onChange={(e) => setKilometers(e.target.value)} />
            </label>
            <label className="block">
              <span className="field-label">{t('record.servicedOn')}</span>
              <input type="date" className="field-input" value={servicedAt} onChange={(e) => setServicedAt(e.target.value)} />
            </label>
          </div>
          {fullDefinition.length === 0 ? (
            <div className="flex items-center gap-2 text-muted py-6"><Spinner className="h-4 w-4" /> {t('common.loading')}</div>
          ) : fullDefinition.map((section) => (
            <div key={section.id} className="panel p-4">
              <h2 className="text-lg mb-1">{resolveLabel(i18n.language, section.titleEn, section.titleIt)}</h2>
              <div className="divide-y divide-steel">
                {section.fields.map((field) => (
                  <div key={field.id}>
                    <FieldRenderer field={field} value={valueFor(field.id, field.type)} onChange={(v) => setFieldValue(field.id, v)} />
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
        </div>
      ) : (
        <div className="space-y-6">
          {record.kilometers != null && <p className="text-muted">{t('record.mileageLine', { km: record.kilometers.toLocaleString() })}</p>}
          {record.sections.length === 0 && <p className="text-muted">{t('record.noItems')}</p>}
          {record.sections.map((section) => (
            <div key={section.id} className="panel p-4">
              <h2 className="text-lg mb-1">{resolveLabel(i18n.language, section.titleEn, section.titleIt)}</h2>
              <div className="divide-y divide-steel">
                {section.items.map((item) => (
                  <div key={item.fieldId} className="flex items-center justify-between gap-4 py-2">
                    <span className="text-sm text-ink">{resolveLabel(i18n.language, item.labelEn, item.labelIt)}</span>
                    <ValueDisplay type={item.type} value={item.value} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
