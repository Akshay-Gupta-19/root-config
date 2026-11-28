/**
 * Booking slots, pure and headless: a person's available blocks (one-off or repeating weekly)
 * expanded into dated occurrences, then cut into bookable slots of a given length, minus the times
 * already taken. The booking calendar shows these to a student, and a site's server imports the
 * same functions to check that a requested slot is really open (one rule, one copy).
 */
import { addDays, dayKeyOf, daysBetween, minuteOfDay, zonedTime, type DayKey } from './dates.js';

/** A span of time: epoch milliseconds, `end` exclusive. */
export interface Interval {
  start: number;
  end: number;
}

/**
 * An available block. With `repeatWeekly` it comes back every week at the same wall-clock time
 * (in the calendar's time zone) from its first day until `until` (a day, inclusive; none: forever).
 */
export interface Availability extends Interval {
  id: string;
  repeatWeekly?: boolean;
  until?: DayKey | null;
}

/** One dated occurrence of an available block. */
export interface Occurrence extends Interval {
  id: string;
}

/** Whether two spans share any time (touching ends don't count). */
export const overlaps = (a: Interval, b: Interval): boolean => a.start < b.end && b.start < a.end;

/** Every occurrence of `blocks` that overlaps `range`, in start order. */
export function expandAvailability(blocks: readonly Availability[], range: Interval, timeZone: string): Occurrence[] {
  const found: Occurrence[] = [];
  for (const block of blocks) {
    if (block.end <= block.start) continue;
    if (!block.repeatWeekly) {
      if (overlaps(block, range)) found.push({ id: block.id, start: block.start, end: block.end });
      continue;
    }
    const firstDay = dayKeyOf(block.start, timeZone);
    const startMinute = minuteOfDay(block.start, timeZone);
    const length = block.end - block.start;
    // Weeks from the first occurrence to the one just before the range starts (never negative).
    const weeksIn = Math.max(0, Math.floor(daysBetween(firstDay, dayKeyOf(range.start, timeZone)) / 7) - 1);
    for (let week = weeksIn; ; week++) {
      const day = addDays(firstDay, week * 7);
      if (block.until && day > block.until) break;
      const start = zonedTime(day, startMinute, timeZone);
      if (start >= range.end) break;
      const occurrence = { id: block.id, start, end: start + length };
      if (overlaps(occurrence, range)) found.push(occurrence);
    }
  }
  return found.sort((a, b) => a.start - b.start || a.end - b.end);
}

/** What `openSlots` needs. */
export interface SlotQuery {
  /** The available blocks. */
  availability: readonly Availability[];
  /** Times already taken (pending or confirmed bookings, other events). */
  busy: readonly Interval[];
  /** The session length, in minutes. */
  minutes: number;
  /** Only slots inside this span. */
  range: Interval;
  /** Slots starting before this instant are left out (the past). */
  now: number;
  timeZone: string;
}

/**
 * The bookable slots: each occurrence cut from its start into back-to-back slots of `minutes`
 * (a remainder too short for a session is dropped), minus slots that overlap a busy time or start
 * before `now`; in start order, each start once.
 */
export function openSlots(query: SlotQuery): Interval[] {
  const length = query.minutes * 60_000;
  if (!(length > 0)) return [];
  const starts = new Set<number>();
  const slots: Interval[] = [];
  for (const occurrence of expandAvailability(query.availability, query.range, query.timeZone)) {
    for (let start = occurrence.start; start + length <= occurrence.end; start += length) {
      const slot = { start, end: start + length };
      if (start < query.now || starts.has(start)) continue;
      if (slot.start < query.range.start || slot.end > query.range.end) continue;
      if (query.busy.some((taken) => overlaps(taken, slot))) continue;
      starts.add(start);
      slots.push(slot);
    }
  }
  return slots.sort((a, b) => a.start - b.start);
}

/** Whether `slot` is exactly one of the open slots (the server's check before taking a booking). */
export function isOpenSlot(slot: Interval, query: Omit<SlotQuery, 'range'>): boolean {
  if (slot.end - slot.start !== query.minutes * 60_000) return false;
  return openSlots({ ...query, range: slot }).some((open) => open.start === slot.start && open.end === slot.end);
}
