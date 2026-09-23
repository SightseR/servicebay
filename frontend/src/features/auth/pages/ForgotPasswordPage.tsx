import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '../../../components/Alert';
import { FormField, TextInput } from '../../../components/FormField';
import { Logo } from '../../../components/Logo';
import { Spinner } from '../../../components/Spinner';
import { apiFetch, ApiError } from '../../../lib/apiClient';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', body: { email }, skipAuth: true });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <div className="panel p-6">
          <h1 className="text-xl mb-1">{t('auth.forgotTitle')}</h1>
          {sent ? (
            <p className="text-sm text-muted mt-2">{t('auth.forgotSent')}</p>
          ) : (
            <>
              <p className="text-sm text-muted mb-6">{t('auth.forgotSubtitle')}</p>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                {error && <Alert>{error}</Alert>}
                <FormField label={t('auth.email')}>
                  <TextInput type="email" required autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
                </FormField>
                <button type="submit" className="btn-primary w-full" disabled={busy}>
                  {busy && <Spinner className="h-4 w-4" />} {t('auth.sendLink')}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          <Link to="/login" className="text-amber hover:underline">{t('auth.backToSignIn')}</Link>
        </p>
      </div>
    </div>
  );
}
