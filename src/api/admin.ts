import { http } from './http';
import type { Reservation, Room, User, UserRole } from '../types';

/**
 * Admin API client — endpoint'ai gali būti iškviečiami tik ROLE=ADMIN
 * vartotojų (BE patikrina per `requireAdmin` middleware'ą). FE'as papildomai
 * gate'inamas per `<RequireAdmin>` route'ą; čia tik raw HTTP wrapper'iai.
 *
 * Paginated atsakymai konsistuoja `{ items, total }` formą, kad FE
 * pagination'as būtų uniformus per visus admin puslapius.
 */

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  /** NULL kai sistemos veiksmas (be aktyvuoto user'io). */
  user: { id: string; displayName: string } | null;
  /** Payload — laisva JSON forma. */
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminReservation extends Reservation {
  room: { id: string; number: string; name: string; floor: number };
}

export interface CreateRoomInput {
  number: string;
  name: string;
  floor: number;
  deskCount: number;
  isShared?: boolean;
}

export interface UpdateRoomInput {
  name?: string;
  floor?: number;
  deskCount?: number;
  isShared?: boolean;
}

export interface UserListParams {
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ReservationListParams {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  roomId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditListParams {
  action?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export const adminApi = {
  users: {
    async list(params: UserListParams = {}): Promise<PaginatedResponse<User>> {
      const { data } = await http.get<PaginatedResponse<User>>('/users', { params });
      return data;
    },
    async get(id: string): Promise<User> {
      const { data } = await http.get<User>(`/users/${id}`);
      return data;
    },
    async assignRooms(id: string, roomIds: string[]): Promise<User> {
      const { data } = await http.put<User>(`/users/${id}/rooms`, { roomIds });
      return data;
    },
    async setRole(id: string, role: UserRole): Promise<User> {
      const { data } = await http.put<User>(`/users/${id}/role`, { role });
      return data;
    },
  },
  rooms: {
    async create(input: CreateRoomInput): Promise<Room> {
      const { data } = await http.post<Room>('/rooms', input);
      return data;
    },
    async update(id: string, input: UpdateRoomInput): Promise<Room> {
      const { data } = await http.put<Room>(`/rooms/${id}`, input);
      return data;
    },
    async remove(id: string): Promise<void> {
      await http.delete(`/rooms/${id}`);
    },
  },
  reservations: {
    async listAll(
      params: ReservationListParams = {},
    ): Promise<PaginatedResponse<AdminReservation>> {
      const { data } = await http.get<PaginatedResponse<AdminReservation>>(
        '/reservations/all',
        { params },
      );
      return data;
    },
    async cancel(id: string): Promise<void> {
      await http.delete(`/reservations/${id}`);
    },
  },
  audit: {
    async list(params: AuditListParams = {}): Promise<PaginatedResponse<AuditEntry>> {
      const { data } = await http.get<PaginatedResponse<AuditEntry>>('/audit', { params });
      return data;
    },
  },
};
