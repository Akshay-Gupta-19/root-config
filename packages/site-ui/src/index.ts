/**
 * @akshayanimateddsa/site-ui: generic site components every site of the workspace can share (the
 * broad package for site UI: a new generic component goes here, not into a new package). Plain
 * DOM, no framework, no runtime dependencies; nothing touches the DOM at import time, and the pure
 * parts (dates, slots, layout) run anywhere, a site's server included. Today: an Outlook-style
 * calendar (Day / Week / Month), a booking calendar on top of it, and a modal dialog. Styles:
 * `css/calendar.css`, `css/dialog.css`; every colour is a `--cal-*` / `--ui-*` token a site sets
 * to its own theme. Every export is listed with one line in `catalogue.json` (checked by a test).
 */

/** The calendar view: Day, Week and Month, a small month, drag to pick a span. */
export {
  createCalendar, CALENDAR_VIEWS,
  type Calendar, type CalendarOptions, type CalendarRange, type CalendarView,
} from './calendar/calendar.js';
/** The booking calendar: availability, session lengths and requests (admin), open slots (student). */
export {
  createBookingCalendar, NOTE_MAX,
  type BookingCalendar, type BookingCalendarOptions, type BookingData, type BookingKind, type BookingMode,
  type BookingRequest, type BookingStatus, type NewAvailability, type NewRequest,
} from './calendar/booking.js';
/** Booking slots: availability expanded, cut to a length, minus taken times (also for servers). */
export {
  expandAvailability, openSlots, isOpenSlot, overlaps,
  type Availability, type Interval, type Occurrence, type SlotQuery,
} from './calendar/slots.js';
/** Where events go: the events of a day, and their spans and columns on the time grid. */
export { eventsOnDay, layoutDay, daySpan, type CalendarEvent, type DaySegment } from './calendar/layout.js';
/** Calendar date maths on 'YYYY-MM-DD' days and time zones. */
export {
  zonedParts, zonedTime, dayKeyOf, minuteOfDay, parseDayKey, addDays, addMonths, weekdayOf, daysBetween,
  startOfWeek, weekDays, startOfMonth, monthGrid, startOfDay,
  type DayKey, type ZonedParts,
} from './calendar/dates.js';
/** A modal dialog with async action buttons. */
export { openDialog, type Dialog, type DialogAction, type DialogOptions } from './dialog.js';
