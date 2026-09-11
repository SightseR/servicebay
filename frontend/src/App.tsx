import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { fetchMe } from './features/auth/authSlice';
import { AppShell } from './features/shell/AppShell';
import { ProtectedRoute } from './features/shell/ProtectedRoute';
import { UsersPage } from './features/admin/pages/UsersPage';
import { RecordsPlaceholder } from './features/shell/RecordsPlaceholder';

export default function App() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);

  // On boot there is no access token yet (memory-only store) unless a refresh token
  // round-trip is added later; for now this just resolves 'idle' -> 'unauthenticated'
  // quickly so ProtectedRoute doesn't spin forever after a hard reload.
  useEffect(() => {
    if (status === 'idle') dispatch(fetchMe());
  }, [status, dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<RecordsPlaceholder />} />
        <Route path="/inspect" element={<div className="p-8 text-muted">Inspection form — Chunk 8.</div>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireManager>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
