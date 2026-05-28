/**
 * Domain types — sek API kontraktą iš Phase 2 backend'o. Tik tos formos,
 * kurios faktiškai naudojamos FE komponentuose.
 */
export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  msObjectId?: string | null;
  /** UUID's — Phase 4 backend grąžina `allowedRoomIds`. */
  allowedRoomIds?: string[];
  /** Legacy / placeholder forma — palikta backward compat'ui, jei
   * scaffold'as kažkur returnino expanded objektus. */
  allowedRooms?: Array<{ id: string; number: string; name?: string; floor?: number }>;
}

export interface Room {
  id: string;
  number: string;
  name: string;
  floor: number;
  deskCount: number;
  isShared: boolean;
  createdAt: string;
}

export interface ReservationUser {
  id: string;
  displayName: string;
}

export interface Reservation {
  id: string;
  roomId: string;
  deskNumber: number;
  date: string; // YYYY-MM-DD
  user: ReservationUser;
  createdAt: string;
}

export interface MyReservation {
  id: string;
  roomId: string;
  deskNumber: number;
  date: string;
  room: { number: string; name: string; floor: number };
  createdAt: string;
}

export interface FloorStats {
  total: number;
  reserved: number;
}

export type StatsByFloor = Record<string, FloorStats>;

/** Error codes returned by the BE — naudojame šiuos UI klaidoms mapping'inti. */
export type ReservationErrorCode =
  | 'DESK_TAKEN'
  | 'USER_HAS_RESERVATION'
  | 'DATE_IN_PAST'
  | 'INVALID_DESK_NUMBER'
  | 'NO_ROOM_ACCESS'
  | 'CANNOT_CANCEL_PAST';
