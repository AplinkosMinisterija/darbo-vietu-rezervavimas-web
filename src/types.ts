/**
 * Domain types — sek spec'o #5 skyrių (data model). Plečiama tik kai
 * naudojam server response'us realiuose komponentuose. Phase 1 turi tik
 * `User`, kad `useAuth()` būtų typed.
 */
export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  msObjectId?: string | null;
  allowedRooms?: Array<{ id: string; number: string; name?: string; floor?: number }>;
}
