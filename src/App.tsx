import { Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import AppLayout from './components/layout/AppLayout';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import AdminPlaceholderPage from './pages/admin/AdminPlaceholderPage';

/**
 * Routing skeleton Phase 1-iui. Real'ūs Phase 4-5 puslapiai (RoomDetailPage,
 * MyReservationsPage, AdminUsersPage, ir t.t.) bus pridėti vėliau pagal
 * spec'o #7 skyrių.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminPlaceholderPage />} />
          <Route path="users" element={<AdminPlaceholderPage />} />
          <Route path="users/:id" element={<AdminPlaceholderPage />} />
          <Route path="rooms" element={<AdminPlaceholderPage />} />
          <Route path="reservations" element={<AdminPlaceholderPage />} />
          <Route path="audit" element={<AdminPlaceholderPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
