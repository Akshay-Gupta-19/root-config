/**
 * Where events go on the calendar, pure and headless: which events touch a day, and in the day and
 * week views, each event's vertical span and its column when events overlap (side by side, as
 * Outlook draws them). The calendar view (calendar.ts) turns these numbers into positions.
 */
import { addDays, startOfDay, minuteOfDay, type DayKey } from './dates.js';
import { overlaps, type Interval } from './slots.js';

/**
 * An event to show. `tone` picks its colour (`--cal-tone-<tone>` in css/calendar.css: event,
 * available, open, pending, confirmed, declined, or a site's own); `data` is the caller's own.
 */
export interface CalendarEvent extends Interval {
  id: string;
  title: string;
  subtitle?: string;
  tone?: string;
  data?: unknown;
}

/** An event's piece on one day of the time grid. */
export interface DaySegment {
  event: CalendarEvent;
  /** Minutes from midnight where the piece starts and ends on this day (0–1440). */
  top: number;
  bottom: number;
  /** Its column among the events it overlaps, and how many columns they need. */
  column: number;
  columns: number;
  /** The event started on an earlier day / goes on to a later day. */
  continuesBefore: boolean;
  continuesAfter: boolean;
}

/** The span of day `key` in `timeZone`. */
export const daySpan = (key: DayKey, timeZone: string): Interval => ({
  start: startOfDay(key, timeZone),
  end: startOfDay(addDays(key, 1), timeZone),
});

/** The events that touch day `key`, in start order (longer first on a tie). */
export function eventsOnDay(events: readonly CalendarEvent[], key: DayKey, timeZone: string): CalendarEvent[] {
  const span = daySpan(key, timeZone);
  return events
    .filter((event) => overlaps(event, span))
    .sort((a, b) => a.start - b.start || b.end - a.end);
}

/**
 * The time-grid pieces for day `key`: each event clipped to the day, and overlapping events split
 * into columns (an event takes the first column free at its start; a group of events that overlap
 * each other, directly or through others, shares one column count).
 */
export function layoutDay(events: readonly CalendarEvent[], key: DayKey, timeZone: string): DaySegment[] {
  const span = daySpan(key, timeZone);
  const minutesOf = (ms: number): number => (ms <= span.start ? 0 : ms >= span.end ? 1440 : minuteOfDay(ms, timeZone));
  const segments: DaySegment[] = [];
  let group: DaySegment[] = [];
  let groupEnd = -Infinity;
  const closeGroup = (): void => {
    const columns = Math.max(1, ...group.map((s) => s.column + 1));
    for (const segment of group) segment.columns = columns;
    group = [];
  };
  for (const event of eventsOnDay(events, key, timeZone)) {
    const top = minutesOf(event.start);
    // A piece is at least 15 minutes tall, so a short event stays clickable.
    const bottom = Math.max(minutesOf(event.end), Math.min(1440, top + 15));
    if (top >= groupEnd) closeGroup();
    const taken = new Set(group.filter((s) => s.bottom > top).map((s) => s.column));
    let column = 0;
    while (taken.has(column)) column++;
    const segment: DaySegment = {
      event, top, bottom, column, columns: 1,
      continuesBefore: event.start < span.start, continuesAfter: event.end > span.end,
    };
    group.push(segment);
    segments.push(segment);
    groupEnd = Math.max(groupEnd, bottom);
  }
  closeGroup();
  return segments;
}
