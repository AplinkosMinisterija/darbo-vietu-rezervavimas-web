import { describe, it, expect } from 'vitest';
import { bucketDays, weekdayProfile, type DayPoint } from './statsBuckets';

// 2026-07-01 is a Wednesday; 2026-07-06 and 2026-07-13 are Mondays.
const day = (date: string, reserved: number): DayPoint => ({ date, reserved });

describe('bucketDays / day', () => {
  it('maps 1:1 with MM-DD labels', () => {
    expect(bucketDays([day('2026-07-01', 3), day('2026-07-02', 0)], 'day')).toEqual([
      { key: '2026-07-01', label: '07-01', reserved: 3, dayCount: 1 },
      { key: '2026-07-02', label: '07-02', reserved: 0, dayCount: 1 },
    ]);
  });
});

describe('bucketDays / week', () => {
  it('groups by ISO week (Mon start), keys on Monday, labels clipped to present days', () => {
    const days: DayPoint[] = [
      day('2026-07-01', 1), // Wed
      day('2026-07-02', 2),
      day('2026-07-03', 3),
      day('2026-07-04', 0), // Sat
      day('2026-07-05', 0), // Sun
      day('2026-07-06', 4), // Mon — new bucket
      day('2026-07-07', 5),
      day('2026-07-08', 6),
    ];
    expect(bucketDays(days, 'week')).toEqual([
      { key: '2026-06-29', label: '07-01–07-05', reserved: 6, dayCount: 5 },
      { key: '2026-07-06', label: '07-06–07-08', reserved: 15, dayCount: 3 },
    ]);
  });
});

describe('bucketDays / month', () => {
  it('groups by calendar month with real dayCount for partial months', () => {
    const days: DayPoint[] = [
      day('2026-06-28', 1),
      day('2026-06-29', 1),
      day('2026-06-30', 1),
      day('2026-07-01', 7),
      day('2026-07-02', 0),
    ];
    expect(bucketDays(days, 'month')).toEqual([
      { key: '2026-06', label: '2026-06', reserved: 3, dayCount: 3 },
      { key: '2026-07', label: '2026-07', reserved: 7, dayCount: 2 },
    ]);
  });
});

describe('bucketDays / empty', () => {
  it('returns [] for every granularity', () => {
    expect(bucketDays([], 'day')).toEqual([]);
    expect(bucketDays([], 'week')).toEqual([]);
    expect(bucketDays([], 'month')).toEqual([]);
  });
});

describe('weekdayProfile', () => {
  it('averages per weekday over occurrences present in range, ordered Mon→Sun', () => {
    const days: DayPoint[] = [
      day('2026-07-06', 8), // Mon
      day('2026-07-07', 6), // Tue
      day('2026-07-13', 4), // Mon again
    ];
    expect(weekdayProfile(days)).toEqual([
      { weekday: 1, label: 'Pr', avgReserved: 6 },
      { weekday: 2, label: 'An', avgReserved: 6 },
    ]);
  });

  it('rounds averages to 1 decimal and handles empty input', () => {
    expect(weekdayProfile([day('2026-07-06', 1), day('2026-07-13', 0), day('2026-07-20', 0)])).toEqual([
      { weekday: 1, label: 'Pr', avgReserved: 0.3 },
    ]);
    expect(weekdayProfile([])).toEqual([]);
  });
});
