import { Check, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Alert } from '../../../components/Alert';
import { Badge } from '../../../components/Badge';
import { FormField, TextInput } from '../../../components/FormField';
import { PasswordInput } from '../../../components/PasswordInput';
import { changePassword, updateProfile } from '../../auth/authSlice';

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user)!;

  const [name, setName] = useState(user.displayName);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    setNameBusy(true); setNameMsg(null);
    const res = await dispatch(updateProfile({ displayName: name }));
    setNameBusy(false);
    setNameMsg(updateProfile.fulfilled.match(res) ? { ok: true, text: t('profile.nameSaved') } : { ok: false, text: res.payload ?? 'Could not save' });
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: t('profile.passwordMismatch') }); return; }
    setPwBusy(true);
    const res = await dispatch(changePassword({ currentPassword: pw.current, newPassword: pw.next }));
    setPwBusy(false);
    if (changePassword.fulfilled.match(res)) { setPw({ current: '', next: '', confirm: '' }); setPwMsg({ ok: true, text: t('profile.passwordChanged') }); }
    else setPwMsg({ ok: false, text: res.payload ?? 'Could not change password' });
  };

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl mb-1">{t('profile.title')}</h1>
      <p className="text-muted mb-6">{t('profile.subtitle')}</p>

      {user.mustChangePassword && (
        <div className="mb-6 flex items-start gap-3 rounded border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div>
            <p>{t('profile.mustChangeBanner')}</p>
            <p className="text-amber/80 mt-1">{t('profile.temporaryHint')}</p>
          </div>
        </div>
      )}

      <form onSubmit={saveName} className="panel p-4 mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="field-label">{t('profile.email')}</span><p className="text-ink">{user.email}</p></div>
          <div><span className="field-label">{t('profile.role')}</span><Badge tone={user.role === 'MANAGER' ? 'amber' : 'muted'}>{user.role === 'MANAGER' ? t('nav.manager') : t('nav.admin_role')}</Badge></div>
        </div>
        <FormField label={t('profile.displayName')}><TextInput value={name} onChange={(e) => setName(e.target.value)} minLength={2} required /></FormField>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-ghost text-sm" disabled={nameBusy || name.trim() === user.displayName}>
            {nameBusy && <Loader2 className="h-4 w-4 animate-spin" />} {t('profile.saveName')}
          </button>
          {nameMsg && <span className={`text-sm flex items-center gap-1.5 ${nameMsg.ok ? 'text-moss' : 'text-rust'}`}>{nameMsg.ok && <Check className="h-4 w-4" />}{nameMsg.text}</span>}
        </div>
      </form>

      <form onSubmit={savePassword} className="panel p-4 space-y-4" noValidate>
        <h2 className="text-lg flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted" /> {t('profile.changePassword')}</h2>
        {pwMsg && !pwMsg.ok && <Alert>{pwMsg.text}</Alert>}
        <FormField label={t('profile.currentPassword')}>
          <PasswordInput autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} required />
        </FormField>
        <FormField label={t('profile.newPassword')} hint={t('auth.passwordHint')}>
          <PasswordInput autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} required minLength={10} />
        </FormField>
        <FormField label={t('profile.confirmPassword')}>
          <PasswordInput autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} required />
        </FormField>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={pwBusy}>
            {pwBusy && <Loader2 className="h-4 w-4 animate-spin" />} {t('profile.changePassword')}
          </button>
          {pwMsg?.ok && <span className="text-sm text-moss flex items-center gap-1.5"><Check className="h-4 w-4" /> {pwMsg.text}</span>}
        </div>
      </form>
    </div>
  );
}
