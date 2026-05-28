import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../state/auth';

/**
 * Route gate'as: prisiimam, kad cookie session'as galioja kol API neatsako
 * 401. Loading state'e — placeholder spinner (vėliau gali keisti į skeleton).
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Kraunama…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
