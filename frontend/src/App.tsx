import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { restoreSession } from './features/auth/authSlice';
import { AppShell } from './features/shell/AppShell';
import { ProtectedRoute } from './features/shell/ProtectedRoute';
import { UsersPage } from './features/admin/pages/UsersPage';
import { AdminLayout } from './features/admin/components/AdminLayout';
import { FormBuilderPage } from './features/admin/form-builder/pages/FormBuilderPage';
import { CompanyProfilePage } from './features/admin/company/pages/CompanyProfilePage';
import { RecordsPage } from './features/records/pages/RecordsPage';
import { InspectPage } from './features/inspect/pages/InspectPage';
import { RecordDetailPage } from './features/records/pages/RecordDetailPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { RecordPrintPage } from './features/records/pages/RecordPrintPage';

export default function App() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);

  // D17: on boot, try to restore the session from the httpOnly refresh cookie before
  // rendering any protected route. Succeeds silently after a reload; falls through to
  // the login page if there is no valid cookie.
  useEffect(() => {
    if (status === 'idle') dispatch(restoreSession());
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
        <Route path="/" element={<RecordsPage />} />
        <Route path="/inspect" element={<InspectPage />} />
        <Route path="/records/:id" element={<RecordDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireManager>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UsersPage />} />
          <Route path="form-builder" element={<FormBuilderPage />} />
          <Route path="company" element={<CompanyProfilePage />} />
        </Route>
      </Route>
      <Route
        path="/records/:id/print"
        element={
          <ProtectedRoute>
            <RecordPrintPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
