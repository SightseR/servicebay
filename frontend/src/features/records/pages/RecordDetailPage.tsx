import { AlertTriangle, ArrowLeft, Loader2, Pencil, Printer, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Alert } from '../../../components/Alert';
import { Plate } from '../../../components/Plate';
import { Spinner } from '../../../components/Spinner';
import { FieldRenderer } from '../../inspect/fields/FieldRenderer';
import { fetchFormDefinition } from '../../inspect/formDefinitionSlice';
import { emptyValueFor, fromWireValue, toWireValue } from '../../inspect/types';
import type { FieldValue } from '../../inspect/types';
import { ValueDisplay } from '../components/ValueDisplay';
import { clearRecord, deleteRecord, fetchRecord, updateRecord } from '../recordSlice';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const specLabel = (v: { gearbox: string | null; motivePower: string | null; driveMode: string | null }) =>
  [v.gearbox, v.motivePower, v.driveMode].filter(Boolean).map((s) => s![0] + s!.slice(1).toLowerCase().replace('_wd', 'x4')).join(' · ') || '—';

export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
    if (!record || !window.confirm('Delete this inspection record? This cannot be undone.')) return;
    const res = await dispatch(deleteRecord(record.id));
    if (deleteRecord.fulfilled.match(res)) navigate('/');
  };

  if (loading && !record) return <div className="p-8 flex items-center gap-2 text-muted"><Spinner className="h-4 w-4" /> Loading…</div>;
  if (error && !record) return <div className="p-8"><Alert>{error}</Alert></div>;
  if (!record) return null;

  const canDelete = currentUser?.role === 'MANAGER' || currentUser?.id === record.createdBy?.id;

  return (
    <div className="p-8 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to records
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Plate>{record.vehicle.regNumber}</Plate>
            {record.legacyId && <span className="text-xs text-muted">imported record</span>}
          </div>
          <h1 className="text-2xl">{record.vehicle.brand} {record.vehicle.model}{record.vehicle.year ? ` · ${record.vehicle.year}` : ''}</h1>
          <p className="text-muted text-sm mt-1">{specLabel(record)} · serviced {formatDate(record.servicedAt)}</p>
          {record.createdBy && <p className="text-muted text-sm">Recorded by {record.createdBy.displayName}{record.updatedBy && record.updatedBy.id !== record.createdBy.id ? `, last edited by ${record.updatedBy.displayName}` : ''}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editing && (
            <>
              <a href={`/records/${record.id}/print`} target="_blank" rel="noreferrer" className="btn-ghost">
                <Printer className="h-4 w-4" /> Print
              </a>
              <button className="btn-ghost" onClick={startEditing}><Pencil className="h-4 w-4" /> Edit</button>
              {canDelete && (
                <button className="btn-danger" onClick={onDelete} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
                </button>
              )}
            </>
          )}
          {editing && (
            <>
              <button className="btn-ghost" onClick={() => setEditing(false)} disabled={saving}><X className="h-4 w-4" /> Cancel</button>
              <button className="btn-primary" onClick={onSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
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
              <span className="field-label">Mileage (km)</span>
              <input type="number" className="field-input" value={kilometers} onChange={(e) => setKilometers(e.target.value)} />
            </label>
            <label className="block">
              <span className="field-label">Serviced on</span>
              <input type="date" className="field-input" value={servicedAt} onChange={(e) => setServicedAt(e.target.value)} />
            </label>
          </div>
          {fullDefinition.length === 0 ? (
            <div className="flex items-center gap-2 text-muted py-6"><Spinner className="h-4 w-4" /> Loading form…</div>
          ) : fullDefinition.map((section) => (
            <div key={section.id} className="panel p-4">
              <h2 className="text-lg mb-1">{section.titleEn}</h2>
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
          {record.kilometers != null && <p className="text-muted">Mileage: {record.kilometers.toLocaleString()} km</p>}
          {record.sections.length === 0 && <p className="text-muted">No checklist items were recorded for this visit.</p>}
          {record.sections.map((section) => (
            <div key={section.id} className="panel p-4">
              <h2 className="text-lg mb-1">{section.titleEn}</h2>
              <div className="divide-y divide-steel">
                {section.items.map((item) => (
                  <div key={item.fieldId} className="flex items-center justify-between gap-4 py-2">
                    <span className="text-sm text-ink">{item.labelEn}</span>
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
