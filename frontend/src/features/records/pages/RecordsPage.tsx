import { Download, Loader2, Search, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Alert } from '../../../components/Alert';
import { Pagination } from '../../../components/Pagination';
import { Plate } from '../../../components/Plate';
import { Spinner } from '../../../components/Spinner';
import { apiDownload } from '../../../lib/apiClient';
import { formatDate } from '../../../lib/i18n/formatDate';
import { useDebouncedValue } from '../../../lib/hooks/useDebouncedValue';
import { VehicleHistoryDrawer } from '../components/VehicleHistoryDrawer';
import { fetchRecords } from '../recordsSlice';

const PAGE_SIZE = 20;

export function RecordsPage() {
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const { data, loading, error } = useAppSelector((s) => s.records);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openVehicleId, setOpenVehicleId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const onExport = async () => {
    setExporting(true); setExportError(null);
    try {
      const params = new URLSearchParams({ lang: i18n.language === 'it' ? 'it' : 'en' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      await apiDownload(`/records/export.csv?${params}`, 'servicebay-records.csv');
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally { setExporting(false); }
  };

  useEffect(() => { setPage(1); }, [debouncedSearch]);
  useEffect(() => {
    dispatch(fetchRecords({ q: debouncedSearch || undefined, page, pageSize: PAGE_SIZE }));
  }, [dispatch, debouncedSearch, page]);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl mb-1">{t('records.title')}</h1>
          <p className="text-muted">{t('records.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="btn-ghost" onClick={onExport} disabled={exporting} title={t('records.exportHint')}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {t('records.exportCsv')}
          </button>
          <Link to="/inspect" className="btn-primary">
            <Wrench className="h-4 w-4" /> {t('nav.newInspection')}
          </Link>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          className="field-input pl-9"
          placeholder={t('records.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {exportError && <div className="mb-4"><Alert>{exportError}</Alert></div>}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-steel text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">{t('records.colVehicle')}</th>
                <th className="px-4 py-3 font-normal">{t('records.colOwner')}</th>
                <th className="px-4 py-3 font-normal">{t('records.colServiced')}</th>
                <th className="px-4 py-3 font-normal">{t('records.colMileage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel">
              {data?.items.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-panel-alt transition-colors"
                  onClick={() => setOpenVehicleId(r.vehicle.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Plate>{r.vehicle.regNumber}</Plate>
                      <span className="text-muted">{r.vehicle.brand} {r.vehicle.model}{r.vehicle.year ? ` · ${r.vehicle.year}` : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{r.vehicle.ownerName ?? t('common.none')}</td>
                  <td className="px-4 py-3">{formatDate(i18n.language, r.servicedAt)}</td>
                  <td className="px-4 py-3 text-muted">{r.kilometers != null ? `${r.kilometers.toLocaleString()} km` : t('common.none')}</td>
                </tr>
              ))}
              {!loading && data?.items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">
                  {search ? t('records.noMatch') : t('records.empty')}
                </td></tr>
              )}
            </tbody>
          </table>
          {loading && <div className="flex items-center gap-2 text-muted py-8 justify-center"><Spinner className="h-4 w-4" /> {t('common.loading')}</div>}
        </div>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
      </div>

      <VehicleHistoryDrawer vehicleId={openVehicleId} onClose={() => setOpenVehicleId(null)} />
    </div>
  );
}
