import { useEffect } from 'react';
import { Check, Loader2, ShieldOff, Undo2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Alert } from '../../../components/Alert';
import { Badge } from '../../../components/Badge';
import { Spinner } from '../../../components/Spinner';
import { approveUser, fetchUsers, updateUser } from '../usersSlice';
import type { ManagedUser } from '../usersSlice';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function RoleBadge({ role }: { role: ManagedUser['role'] }) {
  return <Badge tone={role === 'MANAGER' ? 'amber' : 'muted'}>{role === 'MANAGER' ? 'Manager' : 'Admin'}</Badge>;
}

export function UsersPage() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const { items, loading, error, rowBusy, rowError } = useAppSelector((s) => s.adminUsers);

  useEffect(() => { dispatch(fetchUsers()); }, [dispatch]);

  const pending = items.filter((u) => u.status === 'PENDING');
  const others = items.filter((u) => u.status !== 'PENDING');

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl mb-1">Users</h1>
      <p className="text-muted mb-6">Approve new accounts and manage roles.</p>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading && items.length === 0 && (
        <div className="flex items-center gap-2 text-muted py-8"><Spinner className="h-4 w-4" /> Loading users…</div>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm text-muted mb-2">Awaiting approval</h2>
          <div className="panel divide-y divide-steel">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-ink truncate">{u.displayName}</p>
                  <p className="text-sm text-muted truncate">{u.email} · requested {formatDate(u.createdAt)}</p>
                  {rowError[u.id] && <p className="text-sm text-rust mt-1">{rowError[u.id]}</p>}
                </div>
                <button
                  className="btn-primary shrink-0"
                  disabled={rowBusy[u.id]}
                  onClick={() => dispatch(approveUser(u.id))}
                >
                  {rowBusy[u.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm text-muted mb-2">Team</h2>
        <div className="panel divide-y divide-steel">
          {others.map((u) => {
            const isSelf = u.id === currentUser?.id;
            const busy = !!rowBusy[u.id];
            return (
              <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-ink truncate">{u.displayName}</p>
                    <RoleBadge role={u.role} />
                    {u.status === 'DISABLED' && <Badge tone="rust">Disabled</Badge>}
                    {isSelf && <span className="text-xs text-muted">(you)</span>}
                  </div>
                  <p className="text-sm text-muted truncate">{u.email}</p>
                  {rowError[u.id] && <p className="text-sm text-rust mt-1">{rowError[u.id]}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isSelf && (
                    <select
                      className="field-input !w-auto py-1.5 text-sm"
                      value={u.role}
                      disabled={busy}
                      onChange={(e) => dispatch(updateUser({ id: u.id, role: e.target.value as ManagedUser['role'] }))}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  )}
                  {!isSelf && (
                    <button
                      className="btn-ghost text-sm"
                      disabled={busy}
                      onClick={() => dispatch(updateUser({ id: u.id, status: u.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED' }))}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : u.status === 'DISABLED' ? <Undo2 className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                      {u.status === 'DISABLED' ? 'Enable' : 'Disable'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
