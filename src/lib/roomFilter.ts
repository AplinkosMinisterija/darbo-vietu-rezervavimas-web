import type { Room } from '../types';

export type RoomSharedFilter = 'all' | 'shared' | 'private';

export interface RoomFilter {
  query: string;
  /** `null` — visi aukštai. */
  floor: number | null;
  shared: RoomSharedFilter;
}

export const EMPTY_ROOM_FILTER: RoomFilter = { query: '', floor: null, shared: 'all' };

export type FilterableRoom = Pick<Room, 'number' | 'name' | 'floor' | 'isShared'>;

/**
 * Naudotojai renka be lietuviškų raidžių („teises" vietoj „Teisės"), todėl
 * prieš lyginant nuimame diakritikus (NFD + combining marks intervalas).
 */
export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function matchesQuery(room: FilterableRoom, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) return true;
  return (
    normalizeSearchText(room.number).includes(normalizedQuery) ||
    normalizeSearchText(room.name).includes(normalizedQuery)
  );
}

function matchesShared(room: FilterableRoom, shared: RoomSharedFilter): boolean {
  if (shared === 'all') return true;
  return shared === 'shared' ? room.isShared : !room.isShared;
}

export function filterRooms<T extends FilterableRoom>(rooms: T[], filter: RoomFilter): T[] {
  const normalizedQuery = normalizeSearchText(filter.query);
  return rooms.filter(
    (room) =>
      matchesQuery(room, normalizedQuery) &&
      (filter.floor === null || room.floor === filter.floor) &&
      matchesShared(room, filter.shared),
  );
}
