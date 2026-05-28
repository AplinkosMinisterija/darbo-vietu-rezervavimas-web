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
import AdminPlaceholderPage from './pages/admin/AdminPlaceholderPage';
import { RoomsProvider } from './state/rooms';
import { ToastProvider } from './components/Toast';

/**
 * Routing skeleton. Phase 4 pridėjo /rooms/:nr, /mano, /apzvalga puslapius.
 * Admin pages (Phase 5) lieka placeholder'iuose.
 *
 * RoomsProvider + ToastProvider wrap'inami tik authed sluoksnyje, kad
 * login puslapis neturėtų API call'ų.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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
