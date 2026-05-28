import { http } from './http';
import type { MyReservation, Reservation } from '../types';

export interface CreateReservationInput {
  roomId: string;
  deskNumber: number;
  date: string;
}

/**
 * Reservations API — visi server calls'ai per axios `http` instance'ą su
 * `withCredentials: true`. Error mapping'as paliktas component'ams; čia
 * tik raw HTTP.
 */
export const reservationsApi = {
  async byDate(date: string): Promise<Reservation[]> {
    const { data } = await http.get<Reservation[]>('/reservations', {
      params: { date },
    });
    return data;
  },

  async mine(): Promise<MyReservation[]> {
    const { data } = await http.get<MyReservation[]>('/reservations/mine');
    return data;
  },

  async create(input: CreateReservationInput): Promise<Reservation> {
    const { data } = await http.post<Reservation>('/reservations', input);
    return data;
  },

  async cancel(id: string): Promise<void> {
    await http.delete(`/reservations/${id}`);
  },
};
