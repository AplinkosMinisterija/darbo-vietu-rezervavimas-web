import { http } from './http';
import type { AdminStats, StatsByFloor } from '../types';

export const statsApi = {
  async byFloor(date: string): Promise<StatsByFloor> {
    const { data } = await http.get<StatsByFloor>('/stats', { params: { date } });
    return data;
  },

  /** Admin užimtumo agregatai laisvam [from, to] intervalui (ADMIN-only BE). */
  async adminStats(from: string, to: string): Promise<AdminStats> {
    const { data } = await http.get<AdminStats>('/stats/admin', { params: { from, to } });
    return data;
  },

  /** Parsisiunčia pasirinkto laikotarpio užimtumo ataskaitą (.xlsx). */
  async downloadAdminXlsx(from: string, to: string): Promise<void> {
    const resp = await http.get('/stats/admin/xlsx', {
      params: { from, to },
      responseType: 'blob',
    });
    const cd = resp.headers['content-disposition'] as string | undefined;
    const match = cd?.match(/filename="?([^"]+)"?/i);
    const filename = match ? match[1] : 'uzimtumo-ataskaita.xlsx';

    const url = window.URL.createObjectURL(resp.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Defer revoke — revoking synchronously right after click() can cancel
    // the download on slower browsers before it commits.
    setTimeout(() => window.URL.revokeObjectURL(url), 0);
  },
};
