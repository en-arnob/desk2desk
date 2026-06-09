import { Navigate, Route, Routes } from 'react-router-dom';
import { Role } from '@desk2desk/shared';
import { useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Loader } from './components/Logo';
import { LoginPage } from './pages/Login';
import { NewRequestPage } from './pages/NewRequest';
import { MyRequestsPage } from './pages/MyRequests';
import { RequestDetailPage } from './pages/RequestDetail';
import { SupporterDashboardPage } from './pages/SupporterDashboard';
import { SupportHistoryPage } from './pages/SupportHistory';
import { AdminStatsPage } from './pages/admin/AdminStats';
import { AdminWorkloadPage } from './pages/admin/AdminWorkload';
import { AdminUsersPage } from './pages/admin/AdminUsers';
import { AdminCategoriesPage } from './pages/admin/AdminCategories';
import { AdminDepartmentsPage } from './pages/admin/AdminDepartments';

function Protected({
  children,
  roles,
  provider,
}: {
  children: JSX.Element;
  roles?: Role[];
  provider?: boolean;
}) {
  const { user, loading } = useAuth();
  if (loading) {
    return <Loader fullscreen />;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  if (provider && !user.isProvider) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route
          index
          element={
            user?.isProvider ? (
              <Navigate to="/dashboard" replace />
            ) : user?.role === Role.ADMIN ? (
              <Navigate to="/admin/stats" replace />
            ) : (
              <Navigate to="/requests" replace />
            )
          }
        />
        <Route path="requests" element={<MyRequestsPage />} />
        <Route path="requests/new" element={<NewRequestPage />} />
        <Route path="requests/:id" element={<RequestDetailPage />} />
        <Route
          path="dashboard"
          element={
            <Protected provider>
              <SupporterDashboardPage />
            </Protected>
          }
        />
        <Route
          path="history"
          element={
            <Protected provider>
              <SupportHistoryPage />
            </Protected>
          }
        />
        <Route
          path="admin/stats"
          element={
            <Protected roles={[Role.ADMIN]}>
              <AdminStatsPage />
            </Protected>
          }
        />
        <Route
          path="admin/workload"
          element={
            <Protected roles={[Role.ADMIN]}>
              <AdminWorkloadPage />
            </Protected>
          }
        />
        <Route
          path="admin/users"
          element={
            <Protected roles={[Role.ADMIN]}>
              <AdminUsersPage />
            </Protected>
          }
        />
        <Route
          path="admin/categories"
          element={
            <Protected roles={[Role.ADMIN]}>
              <AdminCategoriesPage />
            </Protected>
          }
        />
        <Route
          path="admin/departments"
          element={
            <Protected roles={[Role.ADMIN]}>
              <AdminDepartmentsPage />
            </Protected>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
