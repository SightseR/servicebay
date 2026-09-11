import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Drawer } from '../../../components/Drawer';
import { Plate } from '../../../components/Plate';
import { Spinner } from '../../../components/Spinner';
import { clearVehicle, fetchVehicle } from '../vehicleSlice';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const specLabel = (v: { gearbox: string | null; motivePower: string | null; driveMode: string | null }) =>
  [v.gearbox, v.motivePower, v.driveMode].filter(Boolean).map((s) => s![0] + s!.slice(1).toLowerCase().replace('_wd', 'x4')).join(' · ') || '—';

export function VehicleHistoryDrawer({ vehicleId, onClose }: { vehicleId: string | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { current: vehicle, loading, error } = useAppSelector((s) => s.vehicle);

  useEffect(() => {
    if (vehicleId) dispatch(fetchVehicle(vehicleId));
    return () => { dispatch(clearVehicle()); };
  }, [vehicleId, dispatch]);

  return (
    <Drawer open={!!vehicleId} onClose={onClose} title={vehicle ? vehicle.regNumber : 'Vehicle history'}>
      {loading && <div className="flex items-center gap-2 text-muted py-6"><Spinner className="h-4 w-4" /> Loading…</div>}
      {error && <p className="text-rust text-sm">{error}</p>}
      {vehicle && (
        <div className="space-y-6">
          <div>
            <Plate>{vehicle.regNumber}</Plate>
            <p className="text-lg mt-2">{vehicle.brand} {vehicle.model}{vehicle.year ? ` · ${vehicle.year}` : ''}</p>
            <p className="text-sm text-muted">{specLabel(vehicle)}</p>
          </div>
          {(vehicle.ownerName || vehicle.ownerPhone || vehicle.ownerEmail) && (
            <div>
              <h3 className="text-sm text-muted mb-1">Owner</h3>
              <p className="text-ink">{vehicle.ownerName ?? '—'}</p>
              <p className="text-sm text-muted">{[vehicle.ownerPhone, vehicle.ownerEmail].filter(Boolean).join(' · ')}</p>
            </div>
          )}
          <div>
            <h3 className="text-sm text-muted mb-2">Service history ({vehicle.records.length})</h3>
            <ul className="space-y-1">
              {vehicle.records.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/records/${r.id}`}
                    className="flex items-center justify-between rounded px-3 py-2 border border-steel hover:border-amber/40 hover:bg-panel-alt transition-colors"
                  >
                    <span>{formatDate(r.servicedAt)}</span>
                    <span className="text-sm text-muted">{r.kilometers != null ? `${r.kilometers.toLocaleString()} km` : '—'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Drawer>
  );
}
