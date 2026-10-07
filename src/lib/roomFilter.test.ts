import { describe, it, expect } from 'vitest';
import {
  EMPTY_ROOM_FILTER,
  SHARED_FILTER_OPTIONS,
  compareRooms,
  filterRooms,
  normalizeSearchText,
  roomFloors,
  type FilterableRoom,
} from './roomFilter';

const rooms: FilterableRoom[] = [
  { number: '211', name: 'Teisės skyrius', floor: 2, isShared: false },
  { number: '305', name: 'Europos Sąjungos ir tarptautinių ryšių grupė', floor: 3, isShared: false },
  { number: '307', name: 'Atliekų politikos grupė', floor: 3, isShared: false },
  { number: '309', name: 'Rezervuojamos darbo vietos', floor: 3, isShared: true },
];

describe('normalizeSearchText', () => {
  it('lowercases, trims and strips Lithuanian diacritics', () => {
    expect(normalizeSearchText('  Teisės ')).toBe('teises');
    expect(normalizeSearchText('ĄČĘĖĮŠŲŪŽ')).toBe('aceeisuuz');
  });
});

describe('filterRooms', () => {
  it('returns every room for the empty filter', () => {
    expect(filterRooms(rooms, EMPTY_ROOM_FILTER)).toHaveLength(4);
  });

  it('matches the room number as a substring', () => {
    expect(filterRooms(rooms, { ...EMPTY_ROOM_FILTER, query: '30' }).map((r) => r.number)).toEqual([
      '305',
      '307',
      '309',
    ]);
  });

  it('matches the name ignoring case and diacritics', () => {
    expect(
      filterRooms(rooms, { ...EMPTY_ROOM_FILTER, query: 'teises' }).map((r) => r.number),
    ).toEqual(['211']);
    expect(filterRooms(rooms, { ...EMPTY_ROOM_FILTER, query: 'GRUPE' }).map((r) => r.number)).toEqual(
      ['305', '307'],
    );
  });

  it('filters by floor, where null means every floor', () => {
    expect(filterRooms(rooms, { ...EMPTY_ROOM_FILTER, floor: 3 })).toHaveLength(3);
    expect(filterRooms(rooms, { ...EMPTY_ROOM_FILTER, floor: null })).toHaveLength(4);
  });

  it('filters shared and private rooms', () => {
    expect(
      filterRooms(rooms, { ...EMPTY_ROOM_FILTER, shared: 'shared' }).map((r) => r.number),
    ).toEqual(['309']);
    expect(filterRooms(rooms, { ...EMPTY_ROOM_FILTER, shared: 'private' })).toHaveLength(3);
  });

  it('combines all three criteria', () => {
    expect(
      filterRooms(rooms, { query: 'grupe', floor: 3, shared: 'private' }).map((r) => r.number),
    ).toEqual(['305', '307']);
  });

  it('keeps the input order and does not mutate the input array', () => {
    const input = [...rooms];
    filterRooms(input, { ...EMPTY_ROOM_FILTER, query: '3' });
    expect(input).toEqual(rooms);
  });
});

describe('roomFloors', () => {
  it('returns each floor once, ascending', () => {
    expect(roomFloors(rooms)).toEqual([2, 3]);
  });

  it('keeps floor 0', () => {
    expect(roomFloors([{ number: '001', name: 'Rūsys', floor: 0, isShared: false }])).toEqual([0]);
  });
});

describe('compareRooms', () => {
  it('orders by floor first, then by number naturally', () => {
    const unsorted: FilterableRoom[] = [
      { number: '207-1', name: '', floor: 2, isShared: false },
      { number: '310', name: '', floor: 3, isShared: false },
      { number: '207', name: '', floor: 2, isShared: false },
      { number: '31', name: '', floor: 3, isShared: false },
    ];
    expect([...unsorted].sort(compareRooms).map((r) => r.number)).toEqual([
      '207',
      '207-1',
      '31',
      '310',
    ]);
  });
});

describe('SHARED_FILTER_OPTIONS', () => {
  it('covers every RoomSharedFilter value, "all" first', () => {
    expect(SHARED_FILTER_OPTIONS.map((o) => o.value)).toEqual(['all', 'shared', 'private']);
  });
});
