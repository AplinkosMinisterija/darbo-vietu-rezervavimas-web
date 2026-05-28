import { http } from './http';
import type { User } from '../types';

/**
 * Auth API — minimal scope Phase 1. Spec'o #6 skyrius:
 *   GET  /api/users/me      → User
 *   POST /api/auth/logout   → Set-Cookie maxAge=0
 */
export const authApi = {
  async me(): Promise<User> {
    const { data } = await http.get<User>('/users/me');
    return data;
  },

  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } catch {
      // Best-effort: cookie expires server-side anyway. Negali blok'inti UI
      // logout'o jei backend hung'asi.
    }
  },
};
