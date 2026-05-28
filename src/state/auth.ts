import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types';

/**
 * Auth state — fetch'inam `/users/me` mount'e, derivinam isAuthenticated /
 * isAdmin iš user objekto. Cookie-based, todėl cross-tab sync per
 * naršyklės cookie jar'ą (be localStorage choreography).
 *
 * AuthProvider yra wrapper'is, kad visi vartotojai gautų tą patį user
 * objektą per Context, ne kiekvienas hook'as fetch'intų atskirai.
 */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => void;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      // 401 → http interceptor jau redirect'ino jei tinka. Mes tiesiog
      // marker'ią null'inam.
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const logout = useCallback(() => {
    // Best-effort BE call; UI iš karto null'inasi, kad logout button'as
    // niekada nelaikytų user'io „pakabintame" state.
    void authApi.logout();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      logout,
      refetch,
    }),
    [user, isLoading, logout, refetch],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth turi būti naudojamas <AuthProvider> viduje');
  }
  return ctx;
}
