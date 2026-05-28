import { http } from './http';
import type { Room } from '../types';

interface RoomListResponse {
  items: Room[];
  total: number;
}

/**
 * Rooms API — BE grąžina paginated formą su `items` + `total`. Mes
 * iškart išskleidžiam į `items[]`, nes citizen UI dirba su pilnu sąrašu.
 */
export const roomsApi = {
  async list(): Promise<Room[]> {
    const { data } = await http.get<RoomListResponse>('/rooms');
    return data.items;
  },

  async get(id: string): Promise<Room> {
    const { data } = await http.get<Room>(`/rooms/${id}`);
    return data;
  },
};
