import { formatYmd, parseYmd, startOfWeek, SHORT_WEEKDAY_LT } from './dates';

/**
 * Statistikos bucketing'as — grynos funkcijos, kurios /admin/statistika
 * puslapyje per-day seriją (iš GET /stats/admin) sugrupuoja į dienos /
 * savaitės / mėnesio stulpelius be papildomo refetch'o.
 */

export type Granularity = 'day' | 'week' | 'month';

export interface DayPoint {
  date: string; // 'YYYY-MM-DD'
  reserved: number;
}

export interface Bucket {
  key: string;
  label: string;
  reserved: number;
  /** Kiek realių dienų pateko į bucket'ą (kraštiniai gali būti daliniai). */
  dayCount: number;
}

const mmdd = (ymd: string) => ymd.slice(5);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** 1..7 = Pr..Sk (ISO weekday) — per parseYmd (lokalus vidurnaktis). */
function isoWeekday(ymd: string): number {
  const day = parseYmd(ymd).getDay(); // 0=Sun
  return day === 0 ? 7 : day;
}

export function bucketDays(days: DayPoint[], granularity: Granularity): Bucket[] {
  if (granularity === 'day') {
    return days.map((d) => ({ key: d.date, label: mmdd(d.date), reserved: d.reserved, dayCount: 1 }));
  }

  // `days` ateina chronologiškai, tad first/last matomi natūraliai.
  const buckets = new Map<string, Bucket & { first: string; last: string }>();
  for (const d of days) {
    const key =
      granularity === 'week' ? formatYmd(startOfWeek(parseYmd(d.date))) : d.date.slice(0, 7);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, label: '', reserved: 0, dayCount: 0, first: d.date, last: d.date };
      buckets.set(key, bucket);
    }
    bucket.reserved += d.reserved;
    bucket.dayCount += 1;
    bucket.last = d.date;
  }

  return [...buckets.values()].map(({ first, last, ...bucket }) => ({
    ...bucket,
    // Savaitės label'is rodo REALIAI patekusias dienas (kraštuose — dalinę savaitę).
    label: granularity === 'week' ? `${mmdd(first)}–${mmdd(last)}` : bucket.key,
  }));
}

export interface WeekdayAvg {
  weekday: number; // 1..7 = Pr..Sk
  label: string;
  avgReserved: number;
}

/** Vidutinis rezervacijų skaičius pagal savaitės dieną (tik pasitaikiusios). */
export function weekdayProfile(days: DayPoint[]): WeekdayAvg[] {
  const agg = new Map<number, { count: number; reserved: number }>();
  for (const d of days) {
    const wd = isoWeekday(d.date);
    const entry = agg.get(wd) ?? { count: 0, reserved: 0 };
    entry.count += 1;
    entry.reserved += d.reserved;
    agg.set(wd, entry);
  }
  return [...agg.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekday, { count, reserved }]) => ({
      weekday,
      label: SHORT_WEEKDAY_LT[weekday - 1],
      avgReserved: round1(reserved / count),
    }));
}
