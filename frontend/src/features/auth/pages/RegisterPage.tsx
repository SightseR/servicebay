import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '../../../components/Alert';
import { FormField, TextInput } from '../../../components/FormField';
import { Logo } from '../../../components/Logo';
import { Spinner } from '../../../components/Spinner';
import { useAppDispatch } from '../../../app/hooks';
import { register } from '../authSlice';

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await dispatch(register(form)).unwrap();
      setDone(true);
    } catch (msg) {
      setError(typeof msg === 'string' ? msg : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
          <div className="panel p-6">
            <h1 className="text-xl mb-2">{t('auth.accountRequestedTitle')}</h1>
            <p className="text-sm text-muted">{t('auth.accountRequestedBody')}</p>
          </div>
          <p className="mt-4 text-sm text-muted">
            <Link to="/login" className="text-amber hover:underline">{t('auth.backToSignIn')}</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <div className="panel p-6">
          <h1 className="text-xl mb-1">{t('auth.createAccountTitle')}</h1>
          <p className="text-sm text-muted mb-6">{t('auth.createAccountSubtitle')}</p>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {error && <Alert>{error}</Alert>}
            <FormField label={t('auth.name')}>
              <TextInput required autoFocus autoComplete="name" value={form.displayName} onChange={set('displayName')} />
            </FormField>
            <FormField label={t('auth.email')}>
              <TextInput type="email" required autoComplete="username" value={form.email} onChange={set('email')} />
            </FormField>
            <FormField label={t('auth.password')} hint={t('auth.passwordHint')}>
              <TextInput type="password" required minLength={10} autoComplete="new-password" value={form.password} onChange={set('password')} />
            </FormField>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting && <Spinner className="h-4 w-4" />}
              {t('auth.requestAccount')}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          {t('auth.alreadyHaveAccount')} <Link to="/login" className="text-amber hover:underline">{t('auth.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
