import { Printer, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '../../../components/Spinner';
import { apiFetch } from '../../../lib/apiClient';
import { ValueDisplay } from '../components/ValueDisplay';
import type { RecordReport } from '../types';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
const specLabel = (v: { gearbox: string | null; motivePower: string | null; driveMode: string | null }) =>
  [v.gearbox, v.motivePower, v.driveMode].filter(Boolean).map((s) => s![0] + s!.slice(1).toLowerCase().replace('_wd', 'x4')).join(' · ');

/**
 * Standalone printable page — no AppShell, light background regardless of the app's
 * dark theme (paper, not screen). Auto-opens the browser print dialog once the report loads.
 */
export function RecordPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<RecordReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<RecordReport>(`/records/${id}/report`).then(setReport).catch(() => setError('Could not load this report'));
  }, [id]);

  useEffect(() => {
    if (report) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [report]);

  if (error) return <div className="p-8 text-rust">{error}</div>;
  if (!report) return <div className="p-8 flex items-center gap-2 text-muted bg-white min-h-screen"><Spinner className="h-4 w-4" /> Preparing report…</div>;

  const c = report.company;
  const address = [c?.addressLine1, c?.addressLine2, [c?.postalCode, c?.city].filter(Boolean).join(' '), c?.country].filter(Boolean);
  const contact = [c?.phone, c?.email, c?.website].filter(Boolean);
  const legal = [c?.businessId && `Business ID ${c.businessId}`, c?.vatId && `VAT ${c.vatId}`].filter(Boolean);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-body">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 14mm; }
          body { background: white; }
        }
      `}</style>

      <div className="no-print sticky top-0 bg-neutral-900 text-white px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-neutral-300">Print preview</span>
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</button>
          <button className="btn-ghost !text-white !border-neutral-600" onClick={() => window.close()}><X className="h-4 w-4" /> Close</button>
        </div>
      </div>

      <div className="max-w-[210mm] mx-auto p-10">
        <header className="flex items-start justify-between border-b-2 border-neutral-900 pb-4 mb-6">
          <div>
            {c?.logoPath && <img src={c.logoPath} alt="" className="h-12 mb-2" />}
            <h1 className="font-display text-2xl tracking-wide">{c?.companyName || 'Vehicle Inspection Report'}</h1>
            {c?.tagline && <p className="text-neutral-600">{c.tagline}</p>}
          </div>
          <div className="text-right text-sm text-neutral-600">
            {address.map((line, i) => <p key={i}>{line}</p>)}
            {contact.length > 0 && <p className="mt-1">{contact.join(' · ')}</p>}
            {legal.length > 0 && <p className="mt-1">{legal.join(' · ')}</p>}
          </div>
        </header>

        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="font-plate tracking-plate text-lg border border-neutral-400 rounded-sm px-2 py-0.5 inline-block">{report.vehicle.regNumber}</p>
            <h2 className="text-xl mt-2">{report.vehicle.brand} {report.vehicle.model}{report.vehicle.year ? ` · ${report.vehicle.year}` : ''}</h2>
            <p className="text-neutral-600 text-sm">{specLabel(report.record) || specLabel(report.vehicle)}</p>
            {report.vehicle.ownerName && <p className="text-neutral-600 text-sm mt-1">Owner: {report.vehicle.ownerName}{report.vehicle.ownerPhone ? ` · ${report.vehicle.ownerPhone}` : ''}</p>}
          </div>
          <div className="text-right text-sm text-neutral-600">
            <p>Serviced {formatDate(report.record.servicedAt)}</p>
            {report.record.kilometers != null && <p>{report.record.kilometers.toLocaleString()} km</p>}
            {report.record.createdBy && <p>By {report.record.createdBy.displayName}</p>}
          </div>
        </div>

        {report.sections.length === 0 && <p className="text-neutral-500">No items were marked for this visit.</p>}

        <div className="space-y-6">
          {report.sections.map((section) => (
            <div key={section.id}>
              <h3 className="font-display text-lg border-b border-neutral-300 pb-1 mb-2">{section.titleEn}</h3>
              <table className="w-full text-sm">
                <tbody>
                  {section.items.map((item) => (
                    <tr key={item.fieldId} className="border-b border-neutral-100 last:border-0">
                      <td className="py-1.5 pr-4 align-top w-1/2">{item.labelEn}</td>
                      <td className="py-1.5 align-top text-neutral-700">
                        <span className="print:text-neutral-900"><ValueDisplay type={item.type} value={item.value} /></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <footer className="mt-10 pt-4 border-t border-neutral-300 text-xs text-neutral-400 flex justify-between">
          <span>Generated {formatDate(report.generatedAt)}</span>
          {report.record.legacyId && <span>Ref. {report.record.legacyId}</span>}
        </footer>
      </div>
    </div>
  );
}
