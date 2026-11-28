/**
 * Calendar date maths, pure and headless (no DOM): the calendar and the booking slots run on it,
 * and a site's server can import it too. Days are `DayKey` strings ('YYYY-MM-DD') so they can be
 * compared and stored as text; instants are epoch milliseconds. Wall-clock times are read in an
 * IANA time zone through `Intl`, so the same code shows India (no daylight saving) or any zone that
 * has it.
 */

/** A calendar day as 'YYYY-MM-DD'. */
export type DayKey = string;

/** An instant's wall-clock parts in a time zone (month 1–12, weekday 0 = Sunday). */
export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number): string => String(n).padStart(2, '0');

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', weekday: 'short',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The wall-clock parts of instant `ms` in `timeZone`. */
export function zonedParts(ms: number, timeZone: string): ZonedParts {
  const parts: Record<string, string> = {};
  for (const part of partsFormatter(timeZone).formatToParts(new Date(ms))) parts[part.type] = part.value;
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour) % 24, minute: Number(parts.minute), weekday: WEEKDAYS.indexOf(parts.weekday ?? ''),
  };
}

/** The day instant `ms` falls on in `timeZone`. */
export function dayKeyOf(ms: number, timeZone: string): DayKey {
  const { year, month, day } = zonedParts(ms, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Minutes since midnight of instant `ms` in `timeZone` (0–1439). */
export function minuteOfDay(ms: number, timeZone: string): number {
  const { hour, minute } = zonedParts(ms, timeZone);
  return hour * 60 + minute;
}

/** A day's year, month (1–12) and day of month. */
export function parseDayKey(key: DayKey): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Not a day (YYYY-MM-DD): ${key}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

const fromUtc = (ms: number): DayKey => new Date(ms).toISOString().slice(0, 10);
const utcNoon = (key: DayKey): number => {
  const { year, month, day } = parseDayKey(key);
  return Date.UTC(year, month - 1, day, 12);
};

/** The day `n` days after `key` (negative: before). */
export const addDays = (key: DayKey, n: number): DayKey => fromUtc(utcNoon(key) + n * 86_400_000);

/** The same day of the month `n` months later, kept inside a shorter month (Jan 31 + 1 → Feb 28). */
export function addMonths(key: DayKey, n: number): DayKey {
  const { year, month, day } = parseDayKey(key);
  const first = new Date(Date.UTC(year, month - 1 + n, 1, 12));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return fromUtc(first.getTime());
}

/** The weekday of a day (0 = Sunday … 6 = Saturday). */
export const weekdayOf = (key: DayKey): number => new Date(utcNoon(key)).getUTCDay();

/** Whole days from `a` to `b` (negative when `b` is earlier). */
export const daysBetween = (a: DayKey, b: DayKey): number => Math.round((utcNoon(b) - utcNoon(a)) / 86_400_000);

/** The first day of the week holding `key`; weeks start on `weekStartsOn` (1 = Monday, the default). */
export function startOfWeek(key: DayKey, weekStartsOn = 1): DayKey {
  return addDays(key, -((weekdayOf(key) - weekStartsOn + 7) % 7));
}

/** The 7 days of the week holding `key`. */
export function weekDays(key: DayKey, weekStartsOn = 1): DayKey[] {
  const first = startOfWeek(key, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** The first day of the month holding `key`. */
export const startOfMonth = (key: DayKey): DayKey => `${key.slice(0, 8)}01`;

/**
 * The month holding `key` as whole weeks (4 to 6 rows of 7 days), starting on `weekStartsOn`; the
 * first and last rows include days of the months around it, as a wall calendar shows them.
 */
export function monthGrid(key: DayKey, weekStartsOn = 1): DayKey[][] {
  const first = startOfMonth(key);
  const last = addDays(addMonths(first, 1), -1);
  const weeks: DayKey[][] = [];
  for (let start = startOfWeek(first, weekStartsOn); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

/** How far `timeZone`'s clock is ahead of UTC at instant `ms`, in milliseconds. */
function offsetAt(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(ms / 60_000) * 60_000;
}

/**
 * The instant when `timeZone`'s clock shows `minutes` past midnight on day `key` (minutes may pass
 * 1440: the next day). A wall time skipped by a daylight-saving jump resolves to the instant after it.
 */
export function zonedTime(key: DayKey, minutes: number, timeZone: string): number {
  const { year, month, day } = parseDayKey(key);
  const wall = Date.UTC(year, month - 1, day, 0, minutes);
  const first = wall - offsetAt(wall, timeZone);
  const second = wall - offsetAt(first, timeZone);
  return second === first ? first : Math.max(first, second);
}

/** The instant day `key` starts in `timeZone`. */
export const startOfDay = (key: DayKey, timeZone: string): number => zonedTime(key, 0, timeZone);
