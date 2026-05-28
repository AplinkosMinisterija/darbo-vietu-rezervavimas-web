import { Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import AppLayout from './components/layout/AppLayout';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RoomDetailPage from './pages/RoomDetailPage';
import MyReservationsPage from './pages/MyReservationsPage';
import StatsPage from './pages/StatsPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminRoomsPage from './pages/admin/AdminRoomsPage';
import AdminReservationsPage from './pages/admin/AdminReservationsPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import EmergencyLoginPage from './pages/admin/EmergencyLoginPage';
import { RoomsProvider } from './state/rooms';
import { ToastProvider } from './components/Toast';

/**
 * Routing skeleton. Phase 5 wire'ino real'ius admin pages (users, rooms,
 * reservations, audit). `/admin` index'as default'ina į `/admin/users` —
 * dažniausias entrypoint'as.
 *
 * RoomsProvider + ToastProvider wrap'inami tik authed sluoksnyje, kad
 * login puslapis neturėtų API call'ų.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/emergency-login" element={<EmergencyLoginPage />} />

      <Route
        element={
          <RequireAuth>
            <ToastProvider>
              <RoomsProvider>
                <AppLayout />
              </RoomsProvider>
            </ToastProvider>
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms/:nr" element={<RoomDetailPage />} />
        <Route path="/mano" element={<MyReservationsPage />} />
        <Route path="/apzvalga" element={<StatsPage />} />

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminUsersPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="rooms" element={<AdminRoomsPage />} />
          <Route path="reservations" element={<AdminReservationsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
