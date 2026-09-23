import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert } from '../../../components/Alert';
import { FormField } from '../../../components/FormField';
import { Logo } from '../../../components/Logo';
import { PasswordInput } from '../../../components/PasswordInput';
import { Spinner } from '../../../components/Spinner';
import { apiFetch, ApiError } from '../../../lib/apiClient';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidLink = token.length < 32;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.next !== pw.confirm) { setError(t('profile.passwordMismatch')); return; }
    setBusy(true);
    try {
      await apiFetch('/auth/reset-password', { method: 'POST', body: { token, newPassword: pw.next }, skipAuth: true });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t('auth.resetInvalid') : err instanceof ApiError ? err.message : 'Request failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <div className="panel p-6">
          <h1 className="text-xl mb-1">{t('auth.resetTitle')}</h1>
          {done ? (
            <p className="text-sm text-moss mt-2">{t('auth.resetDone')}</p>
          ) : invalidLink ? (
            <Alert>{t('auth.resetInvalid')}</Alert>
          ) : (
            <>
              <p className="text-sm text-muted mb-6">{t('auth.resetSubtitle')}</p>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                {error && <Alert>{error}</Alert>}
                <FormField label={t('profile.newPassword')} hint={t('auth.passwordHint')}>
                  <PasswordInput autoFocus autoComplete="new-password" required minLength={10} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
                </FormField>
                <FormField label={t('profile.confirmPassword')}>
                  <PasswordInput autoComplete="new-password" required value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
                </FormField>
                <button type="submit" className="btn-primary w-full" disabled={busy}>
                  {busy && <Spinner className="h-4 w-4" />} {t('auth.setPassword')}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          {done || invalidLink ? (
            <Link to={invalidLink ? '/forgot-password' : '/login'} className="text-amber hover:underline">{invalidLink ? t('auth.forgotLink') : t('auth.signIn')}</Link>
          ) : (
            <Link to="/login" className="text-amber hover:underline">{t('auth.backToSignIn')}</Link>
          )}
        </p>
      </div>
    </div>
  );
}
