import { Search, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Alert } from '../../../components/Alert';
import { Pagination } from '../../../components/Pagination';
import { Plate } from '../../../components/Plate';
import { Spinner } from '../../../components/Spinner';
import { useDebouncedValue } from '../../../lib/hooks/useDebouncedValue';
import { VehicleHistoryDrawer } from '../components/VehicleHistoryDrawer';
import { fetchRecords } from '../recordsSlice';

const PAGE_SIZE = 20;

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export function RecordsPage() {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((s) => s.records);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openVehicleId, setOpenVehicleId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch]);
  useEffect(() => {
    dispatch(fetchRecords({ q: debouncedSearch || undefined, page, pageSize: PAGE_SIZE }));
  }, [dispatch, debouncedSearch, page]);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl mb-1">Records</h1>
          <p className="text-muted">Every inspection, newest first.</p>
        </div>
        <Link to="/inspect" className="btn-primary shrink-0">
          <Wrench className="h-4 w-4" /> New inspection
        </Link>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          className="field-input pl-9"
          placeholder="Search by registration, owner, phone, brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-steel text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Vehicle</th>
                <th className="px-4 py-3 font-normal">Owner</th>
                <th className="px-4 py-3 font-normal">Serviced</th>
                <th className="px-4 py-3 font-normal">Mileage</th>
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
                  <td className="px-4 py-3 text-muted">{r.vehicle.ownerName ?? '—'}</td>
                  <td className="px-4 py-3">{formatDate(r.servicedAt)}</td>
                  <td className="px-4 py-3 text-muted">{r.kilometers != null ? `${r.kilometers.toLocaleString()} km` : '—'}</td>
                </tr>
              ))}
              {!loading && data?.items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">
                  {search ? 'No records match your search.' : 'No inspections yet — start with New inspection.'}
                </td></tr>
              )}
            </tbody>
          </table>
          {loading && <div className="flex items-center gap-2 text-muted py-8 justify-center"><Spinner className="h-4 w-4" /> Loading…</div>}
        </div>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
      </div>

      <VehicleHistoryDrawer vehicleId={openVehicleId} onClose={() => setOpenVehicleId(null)} />
    </div>
  );
}
