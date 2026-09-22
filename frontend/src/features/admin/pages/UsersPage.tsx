import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, ShieldOff, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Alert } from '../../../components/Alert';
import { Badge } from '../../../components/Badge';
import { Spinner } from '../../../components/Spinner';
import { formatDate } from '../../../lib/i18n/formatDate';
import { approveUser, fetchUsers, resetUserPassword, updateUser } from '../usersSlice';
import type { ManagedUser } from '../usersSlice';

function RoleBadge({ role }: { role: ManagedUser['role'] }) {
  const { t } = useTranslation();
  return <Badge tone={role === 'MANAGER' ? 'amber' : 'muted'}>{role === 'MANAGER' ? t('nav.manager') : t('nav.admin_role')}</Badge>;
}

export function UsersPage() {
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const currentUser = useAppSelector((s) => s.auth.user);
  const { items, loading, error, rowBusy, rowError } = useAppSelector((s) => s.adminUsers);

  useEffect(() => { dispatch(fetchUsers()); }, [dispatch]);
  const [tempPw, setTempPw] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const onReset = async (u: ManagedUser) => {
    if (!window.confirm(t('admin.confirmReset'))) return;
    const res = await dispatch(resetUserPassword(u.id));
    if (resetUserPassword.fulfilled.match(res)) { setTempPw({ name: u.displayName, password: res.payload.temporaryPassword }); setCopied(false); }
  };

  const pending = items.filter((u) => u.status === 'PENDING');
  const others = items.filter((u) => u.status !== 'PENDING');

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <h1 className="text-2xl mb-1">{t('admin.usersTitle')}</h1>
      <p className="text-muted mb-6">{t('admin.usersSubtitle')}</p>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading && items.length === 0 && (
        <div className="flex items-center gap-2 text-muted py-8"><Spinner className="h-4 w-4" /> {t('common.loading')}</div>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm text-muted mb-2">{t('admin.awaitingApproval')}</h2>
          <div className="panel divide-y divide-steel">
            {pending.map((u) => (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-ink truncate">{u.displayName}</p>
                  <p className="text-sm text-muted truncate">{u.email} · {t('admin.requestedOn', { date: formatDate(i18n.language, u.createdAt) })}</p>
                  {rowError[u.id] && <p className="text-sm text-rust mt-1">{rowError[u.id]}</p>}
                </div>
                <button
                  className="btn-primary shrink-0"
                  disabled={rowBusy[u.id]}
                  onClick={() => dispatch(approveUser(u.id))}
                >
                  {rowBusy[u.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t('admin.approve')}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm text-muted mb-2">{t('admin.team')}</h2>
        <div className="panel divide-y divide-steel">
          {others.map((u) => {
            const isSelf = u.id === currentUser?.id;
            const busy = !!rowBusy[u.id];
            return (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-ink truncate">{u.displayName}</p>
                    <RoleBadge role={u.role} />
                    {u.status === 'DISABLED' && <Badge tone="rust">{t('admin.disabled')}</Badge>}
                    {u.mustChangePassword && u.status !== 'DISABLED' && <Badge tone="amber">{t('admin.mustChange')}</Badge>}
                    {isSelf && <span className="text-xs text-muted">{t('admin.you')}</span>}
                  </div>
                  <p className="text-sm text-muted truncate">{u.email}</p>
                  {rowError[u.id] && <p className="text-sm text-rust mt-1">{rowError[u.id]}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
                  {!isSelf && (
                    <select
                      className="field-input !w-auto py-1.5 text-sm"
                      value={u.role}
                      disabled={busy}
                      onChange={(e) => dispatch(updateUser({ id: u.id, role: e.target.value as ManagedUser['role'] }))}
                    >
                      <option value="ADMIN">{t('nav.admin_role')}</option>
                      <option value="MANAGER">{t('nav.manager')}</option>
                    </select>
                  )}
                  {!isSelf && u.status === 'ACTIVE' && (
                    <button className="btn-ghost text-sm" disabled={busy} onClick={() => onReset(u)} title={t('admin.resetPassword')}>
                      <KeyRound className="h-4 w-4" /> {t('admin.resetPassword')}
                    </button>
                  )}
                  {!isSelf && (
                    <button
                      className="btn-ghost text-sm"
                      disabled={busy}
                      onClick={() => dispatch(updateUser({ id: u.id, status: u.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED' }))}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : u.status === 'DISABLED' ? <Undo2 className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                      {u.status === 'DISABLED' ? t('admin.enable') : t('admin.disable')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {tempPw && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
          <div className="panel p-6 w-full max-w-md">
            <h2 className="text-lg mb-2">{t('admin.tempPasswordTitle', { name: tempPw.name })}</h2>
            <p className="text-sm text-muted mb-4">{t('admin.tempPasswordBody')}</p>
            <div className="flex items-center gap-2">
              <code className="plate flex-1 justify-center text-base py-2 select-all" data-testid="temp-password">{tempPw.password}</code>
              <button
                className="btn-ghost"
                onClick={() => { void navigator.clipboard?.writeText(tempPw.password); setCopied(true); }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t('admin.copied') : t('admin.copy')}
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button className="btn-primary" onClick={() => setTempPw(null)}>{t('admin.done')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
