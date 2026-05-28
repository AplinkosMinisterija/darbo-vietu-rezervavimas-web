import { http } from './http';
import type { StatsByFloor } from '../types';

export const statsApi = {
  async byFloor(date: string): Promise<StatsByFloor> {
    const { data } = await http.get<StatsByFloor>('/stats', { params: { date } });
    return data;
  },
};
