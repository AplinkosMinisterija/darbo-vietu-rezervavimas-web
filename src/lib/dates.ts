/**
 * Date utilities — `YYYY-MM-DD` lygyje, lokaliam laiko zonai. Visi
 * komponentai dirba su string'ais, kad būtų lengva palyginti su BE
 * grąžinamais reikšmėmis (`date: 'YYYY-MM-DD'`).
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayYmd(): string {
  return formatYmd(new Date());
}

/** Returns Monday of the ISO week containing `d`. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = out.getDay(); // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  out.setDate(out.getDate() + diff);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

export function addMonths(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return out;
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isPastDate(ymd: string): boolean {
  return ymd < todayYmd();
}

export function sameYmd(a: Date, b: Date): boolean {
  return formatYmd(a) === formatYmd(b);
}

export const SHORT_WEEKDAY_LT = ['Pr', 'An', 'Tr', 'Ke', 'Pe', 'Š', 'S'];
export const MONTH_NAMES_LT = [
  'Sausis',
  'Vasaris',
  'Kovas',
  'Balandis',
  'Gegužė',
  'Birželis',
  'Liepa',
  'Rugpjūtis',
  'Rugsėjis',
  'Spalis',
  'Lapkritis',
  'Gruodis',
];

export function humanDate(ymd: string | null | undefined): string {
  if (!ymd) return '';
  // Tolerate ISO datetime ("2026-05-28T00:00:00.000Z") — take the date part.
  const dateOnly = String(ymd).slice(0, 10);
  const d = parseYmd(dateOnly);
  const monthIdx = d.getMonth();
  if (Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return String(ymd);
  return `${d.getDate()} ${MONTH_NAMES_LT[monthIdx].toLowerCase()} ${d.getFullYear()}`;
}
