import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MONTH_NAMES_LT,
  SHORT_WEEKDAY_LT,
  addDays,
  addMonths,
  formatYmd,
  humanDate,
  isPastDate,
  isWeekend,
  parseYmd,
  sameYmd,
  startOfWeek,
  todayYmd,
} from './dates';

describe('formatYmd', () => {
  it('formats a date as YYYY-MM-DD with zero padding', () => {
    expect(formatYmd(new Date(2026, 5, 29))).toBe('2026-06-29');
    expect(formatYmd(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatYmd(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('parseYmd', () => {
  it('parses a YMD string into a local Date', () => {
    const d = parseYmd('2026-06-29');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(29);
  });

  it('round-trips with formatYmd', () => {
    expect(formatYmd(parseYmd('2026-02-09'))).toBe('2026-02-09');
  });

  it('defaults missing month/day to 1 (Jan 1st) when only a year is given', () => {
    const d = parseYmd('2026');
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
});

describe('startOfWeek', () => {
  it('returns the Monday of the ISO week (Wednesday → Monday)', () => {
    // 2026-06-29 is a Monday; use a midweek date in that week.
    const wed = new Date(2026, 6, 1); // 2026-07-01 Wednesday
    const mon = startOfWeek(wed);
    expect(mon.getDay()).toBe(1);
    expect(formatYmd(mon)).toBe('2026-06-29');
  });

  it('maps a Monday to itself', () => {
    const mon = new Date(2026, 5, 29); // Monday
    expect(formatYmd(startOfWeek(mon))).toBe('2026-06-29');
  });

  it('maps a Sunday back to the Monday of the same ISO week (not the next day)', () => {
    const sun = new Date(2026, 6, 5); // 2026-07-05 Sunday
    const mon = startOfWeek(sun);
    expect(mon.getDay()).toBe(1);
    expect(formatYmd(mon)).toBe('2026-06-29');
  });
});

describe('addDays / addMonths', () => {
  it('adds and subtracts days across month boundaries', () => {
    expect(formatYmd(addDays(new Date(2026, 5, 29), 5))).toBe('2026-07-04');
    expect(formatYmd(addDays(new Date(2026, 6, 1), -2))).toBe('2026-06-29');
  });

  it('addMonths snaps to the 1st of the resulting month', () => {
    expect(formatYmd(addMonths(new Date(2026, 5, 29), 1))).toBe('2026-07-01');
    expect(formatYmd(addMonths(new Date(2026, 0, 15), -1))).toBe('2025-12-01');
  });
});

describe('isWeekend', () => {
  it('is true for Saturday and Sunday only', () => {
    expect(isWeekend(new Date(2026, 6, 4))).toBe(true); // Sat
    expect(isWeekend(new Date(2026, 6, 5))).toBe(true); // Sun
    expect(isWeekend(new Date(2026, 5, 29))).toBe(false); // Mon
    expect(isWeekend(new Date(2026, 6, 3))).toBe(false); // Fri
  });
});

describe('sameYmd', () => {
  it('compares only the calendar day, ignoring time', () => {
    expect(sameYmd(new Date(2026, 5, 29, 8), new Date(2026, 5, 29, 23))).toBe(true);
    expect(sameYmd(new Date(2026, 5, 29), new Date(2026, 5, 30))).toBe(false);
  });
});

describe('todayYmd / isPastDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 29, 10, 0, 0)); // 2026-06-29 10:00 local
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('todayYmd returns the current local date', () => {
    expect(todayYmd()).toBe('2026-06-29');
  });

  it('treats earlier dates as past', () => {
    expect(isPastDate('2026-06-28')).toBe(true);
  });

  it('treats today as NOT past (boundary is strict <)', () => {
    expect(isPastDate('2026-06-29')).toBe(false);
  });

  it('treats future dates as NOT past', () => {
    expect(isPastDate('2026-06-30')).toBe(false);
  });
});

describe('humanDate', () => {
  it('formats a YMD into "<day> <month-lowercase-lt> <year>"', () => {
    expect(humanDate('2026-06-29')).toBe('29 birželis 2026');
    expect(humanDate('2026-01-05')).toBe('5 sausis 2026');
  });

  it('tolerates ISO datetime strings by slicing the date part', () => {
    expect(humanDate('2026-05-28T00:00:00.000Z')).toBe('28 gegužė 2026');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(humanDate(null)).toBe('');
    expect(humanDate(undefined)).toBe('');
    expect(humanDate('')).toBe('');
  });
});

describe('LT constants', () => {
  it('has 7 short weekday labels starting Monday', () => {
    expect(SHORT_WEEKDAY_LT).toHaveLength(7);
    expect(SHORT_WEEKDAY_LT[0]).toBe('Pr');
  });

  it('has 12 month names', () => {
    expect(MONTH_NAMES_LT).toHaveLength(12);
    expect(MONTH_NAMES_LT[5]).toBe('Birželis');
  });
});
