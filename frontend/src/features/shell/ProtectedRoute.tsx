import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { Spinner } from '../../components/Spinner';

export function ProtectedRoute({ children, requireManager = false }: { children: React.ReactNode; requireManager?: boolean }) {
  const { status, user } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><Spinner className="h-6 w-6 text-amber" /></div>;
  }
  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (requireManager && user.role !== 'MANAGER') {
    return <Navigate to="/" replace />;
  }
  // A manager-reset account can only reach the profile page until a new password is set.
  if (user.mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }
  return <>{children}</>;
}
