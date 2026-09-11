import type { FormEvent } from 'react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '../../../components/Alert';
import { FormField, TextInput } from '../../../components/FormField';
import { Logo } from '../../../components/Logo';
import { Spinner } from '../../../components/Spinner';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { login } from '../authSlice';

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAppSelector((s) => s.auth.status);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    const to = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={to} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await dispatch(login({ email, password })).unwrap();
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (msg) {
      setError(typeof msg === 'string' ? msg : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <div className="panel p-6">
          <h1 className="text-xl mb-1">Sign in</h1>
          <p className="text-sm text-muted mb-6">Vehicle inspection &amp; service records</p>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {error && <Alert>{error}</Alert>}
            <FormField label="Email">
              <TextInput type="email" required autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <FormField label="Password">
              <TextInput type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormField>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting && <Spinner className="h-4 w-4" />}
              Sign in
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          New here? <a href="/register" className="text-amber hover:underline">Create an account</a>
        </p>
      </div>
    </div>
  );
}
