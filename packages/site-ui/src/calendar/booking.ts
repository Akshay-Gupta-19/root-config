/**
 * The booking calendar: the calendar view (calendar.ts) with 1:1 session booking on top, in two
 * modes. **Admin:** drag on the time grid (or "New availability") to add an available block, one-off
 * or repeating weekly; click a block to delete it; set each session kind's length; see the requests
 * and confirm or decline each one. **Student:** pick a session kind, see the open slots (the
 * availability cut to that kind's length, minus taken times: slots.ts) and request one with a note.
 * An admin can preview the student mode (`previewStudent`). Everything it shows comes from the
 * site's `load()`, and every change goes through the site's callbacks, which call the site's own
 * server; this module stores nothing. Dialogs: dialog.ts. Styles: css/calendar.css, css/dialog.css.
 */
import { append, el } from '../dom.js';
import { openDialog } from '../dialog.js';
import { createCalendar, type Calendar, type CalendarOptions, type CalendarRange } from './calendar.js';
import { dayKeyOf, minuteOfDay, zonedTime, type DayKey } from './dates.js';
import type { CalendarEvent } from './layout.js';
import { expandAvailability, openSlots, type Availability, type Interval } from './slots.js';

/** A kind of session (e.g. mentorship, mock interview); `minutes` null: its length isn't set yet. */
export interface BookingKind {
  id: string;
  name: string;
  minutes: number | null;
}

/** A request's state: waiting for the admin, confirmed, or declined. */
export type BookingStatus = 'pending' | 'confirmed' | 'declined';

/**
 * A booking request. The admin sees `who`, `contact` and `note`; a student gets other people's
 * requests only as taken times (no names), and their own with `mine: true`.
 */
export interface BookingRequest extends Interval {
  id: string;
  kind: string;
  status: BookingStatus;
  who?: string;
  contact?: string;
  note?: string;
  mine?: boolean;
}

/** Everything the booking calendar shows, from the site's `load()`. */
export interface BookingData {
  kinds: BookingKind[];
  availability: Availability[];
  requests: BookingRequest[];
}

/** A new available block, as the admin entered it. */
export interface NewAvailability extends Interval {
  repeatWeekly: boolean;
  until: DayKey | null;
}

/** A student's request, as they sent it. */
export interface NewRequest extends Interval {
  kind: string;
  note: string;
}

/** The two modes. */
export type BookingMode = 'admin' | 'student';

/** Settings for `createBookingCalendar`: the calendar's own, plus the data source and the actions. */
export interface BookingCalendarOptions extends Pick<CalendarOptions, 'timeZone' | 'locale' | 'view' | 'weekStartsOn' | 'scrollToHour' | 'now'> {
  mode: BookingMode;
  /** Admin mode only: a switch in the toolbar to see the student mode. */
  previewStudent?: boolean;
  /**
   * Loads everything shown, for the mode on screen (called at the start, after every change and when
   * the admin switches mode: a site's server answers a student with taken times only).
   */
  load: (mode: BookingMode) => Promise<BookingData>;
  addAvailability?: (block: NewAvailability) => Promise<unknown>;
  deleteAvailability?: (id: string) => Promise<unknown>;
  saveMinutes?: (kind: string, minutes: number) => Promise<unknown>;
  decide?: (id: string, status: 'confirmed' | 'declined') => Promise<unknown>;
  request?: (request: NewRequest) => Promise<unknown>;
  /** Shows a short message after a change (default: none). */
  notify?: (message: string) => void;
}

/** A mounted booking calendar. */
export interface BookingCalendar {
  calendar: Calendar;
  mode: () => BookingMode;
  /** Switches mode and loads that mode's data. */
  setMode: (mode: BookingMode) => void;
  /** Loads the data again and redraws. */
  reload: () => Promise<void>;
  destroy: () => void;
}

/** The longest note a student can send. */
export const NOTE_MAX = 500;

const hhmm = (minutes: number): string => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const minutesOf = (value: string): number => {
  const [h = 'x', m = 'x'] = value.split(':');
  return Number(h) * 60 + Number(m);
};

/** Mounts a booking calendar in `host` (its content is replaced). */
export function createBookingCalendar(host: HTMLElement, options: BookingCalendarOptions): BookingCalendar {
  const { timeZone } = options;
  const now = options.now ?? Date.now;
  let mode: BookingMode = options.mode;
  let data: BookingData | null = null;
  let kindId: string | null = null; // the student's chosen session kind

  const status = el('p', { class: 'ui-status', role: 'status' }, 'Loading…');
  const panels = el('div', { class: 'bk-panels' });
  const modeSwitch = el('div', { class: 'cal-views bk-mode', role: 'group', 'aria-label': 'Show as' });
  const newButton = el('button', { type: 'button', class: 'cal-btn cal-btn--primary bk-new', onclick: () => availabilityDialog(null) }, '+ New availability');

  const calendar = createCalendar(host, {
    ...options,
    onRangeChange: () => refresh(),
    onSelectEvent: (event) => select(event),
    onCreate: (span) => {
      if (mode === 'admin') availabilityDialog(span);
    },
  });
  calendar.element.classList.add('bk');
  append(calendar.toolbarEnd, newButton, modeSwitch);
  append(calendar.sidebar, status, panels);

  /* ---------- Formatting ---------- */
  const whenFormatter = new Intl.DateTimeFormat(options.locale, { timeZone, weekday: 'short', day: 'numeric', month: 'short' });
  const timeFormatter = new Intl.DateTimeFormat(options.locale, { timeZone, hour: 'numeric', minute: '2-digit' });
  const when = (span: Interval): string =>
    `${whenFormatter.format(new Date(span.start))}, ${timeFormatter.format(new Date(span.start))} – ${timeFormatter.format(new Date(span.end))}`;
  const kindName = (id: string): string => data?.kinds.find((k) => k.id === id)?.name ?? id;
  const say = (message: string): void => options.notify?.(message);

  /* ---------- Events for what is on screen ---------- */
  function eventsFor(range: CalendarRange): CalendarEvent[] {
    if (!data) return [];
    const live = data.requests.filter((r) => r.status !== 'declined');
    if (mode === 'admin') {
      const blocks = new Map(data.availability.map((b) => [b.id, b]));
      return [
        ...expandAvailability(data.availability, range, timeZone).map((o) => ({
          id: `a:${o.id}:${o.start}`, start: o.start, end: o.end, title: 'Available', tone: 'available',
          ...(blocks.get(o.id)?.repeatWeekly ? { subtitle: 'Every week' } : {}),
          data: { availability: blocks.get(o.id), occurrence: o },
        })),
        ...live.map((r) => ({
          id: `r:${r.id}`, start: r.start, end: r.end, tone: r.status,
          title: `${r.status === 'pending' ? 'Request' : 'Booked'}: ${kindName(r.kind)}`,
          ...(r.who ? { subtitle: r.who } : {}),
          data: { request: r },
        })),
      ];
    }
    const kind = data.kinds.find((k) => k.id === kindId);
    const slots = kind?.minutes
      ? openSlots({ availability: data.availability, busy: live, minutes: kind.minutes, range, now: now(), timeZone })
      : [];
    return [
      ...slots.map((s) => ({ id: `s:${s.start}`, start: s.start, end: s.end, title: 'Open', subtitle: kind?.name ?? '', tone: 'open', data: { slot: s } })),
      ...live.filter((r) => r.mine).map((r) => ({
        id: `r:${r.id}`, start: r.start, end: r.end, tone: r.status,
        title: `${r.status === 'pending' ? 'Requested' : 'Booked'}: ${kindName(r.kind)}`, data: { request: r },
      })),
    ];
  }

  function refresh(): void {
    calendar.setEvents(eventsFor(calendar.range()));
    renderPanels();
  }

  async function reload(): Promise<void> {
    try {
      data = await options.load(mode);
      status.textContent = '';
      status.hidden = true;
      const bookable = data.kinds.filter((k) => k.minutes);
      if (!bookable.some((k) => k.id === kindId)) kindId = bookable[0]?.id ?? null;
    } catch (problem) {
      status.textContent = problem instanceof Error ? problem.message : String(problem);
      status.hidden = false;
    }
    refresh();
  }

  /** Runs a change, then reloads and says `done`; a failure is thrown on to the dialog that shows it. */
  async function change(action: (() => Promise<unknown>) | undefined, done: string): Promise<void> {
    if (!action) throw new Error('This action is not available here.');
    await action();
    say(done);
    await reload();
  }

  /* ---------- The sidebar panels ---------- */
  function renderPanels(): void {
    newButton.hidden = mode !== 'admin';
    modeSwitch.hidden = !(options.mode === 'admin' && options.previewStudent);
    modeSwitch.replaceChildren(...(['admin', 'student'] as const).map((m) =>
      el('button', { type: 'button', class: 'cal-view-btn', 'aria-pressed': String(mode === m), onclick: () => setMode(m) },
        m === 'admin' ? 'My view' : 'Student view')));
    if (!data) {
      panels.replaceChildren();
      return;
    }
    panels.replaceChildren(...(mode === 'admin' ? adminPanels(data) : studentPanels(data)));
  }

  function panel(title: string, ...children: (Node | string)[]): HTMLElement {
    return el('section', { class: 'bk-panel' }, el('h3', { class: 'bk-panel-title' }, title), ...children);
  }

  function requestList(requests: BookingRequest[], empty: string): HTMLElement {
    if (!requests.length) return el('p', { class: 'bk-empty' }, empty);
    return el('ul', { class: 'bk-list' }, ...requests.map((r) => el('li', {},
      el('button', { type: 'button', class: 'bk-item', 'data-tone': r.status, onclick: () => { calendar.goTo(dayKeyOf(r.start, timeZone)); requestDialog(r); } },
        el('span', { class: 'bk-item-when' }, when(r)),
        el('span', { class: 'bk-item-what' }, [kindName(r.kind), r.who].filter(Boolean).join(' · ')),
        mode === 'student' ? el('span', { class: 'bk-item-status' }, r.status) : null,
      ))));
  }

  function adminPanels(current: BookingData): HTMLElement[] {
    const lengths = el('form', { class: 'bk-lengths' });
    for (const kind of current.kinds) {
      const input = el('input', { type: 'number', name: kind.id, min: 15, max: 240, step: 5, placeholder: 'not set', value: kind.minutes ?? '', 'aria-label': `${kind.name} length in minutes` });
      append(lengths, el('label', { class: 'bk-length' }, el('span', {}, kind.name), input, el('span', { class: 'bk-unit' }, 'min')));
    }
    append(lengths, el('button', { type: 'submit', class: 'cal-btn' }, 'Save lengths'));
    lengths.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(lengths);
      const changed = current.kinds.filter((k) => form.get(k.id) !== '' && Number(form.get(k.id)) !== k.minutes);
      void (async () => {
        try {
          for (const kind of changed) await options.saveMinutes?.(kind.id, Number(form.get(kind.id)));
          if (changed.length) say('Session lengths saved.');
          await reload();
        } catch (problem) {
          status.textContent = problem instanceof Error ? problem.message : String(problem);
          status.hidden = false;
        }
      })();
    });
    const pending = current.requests.filter((r) => r.status === 'pending').sort((a, b) => a.start - b.start);
    const upcoming = current.requests.filter((r) => r.status === 'confirmed' && r.end > now()).sort((a, b) => a.start - b.start);
    return [
      panel(`Requests (${pending.length})`, requestList(pending, 'No requests waiting.')),
      panel('Booked', requestList(upcoming, 'Nothing booked yet.')),
      panel('Session lengths', lengths),
    ];
  }

  function studentPanels(current: BookingData): HTMLElement[] {
    const bookable = current.kinds.filter((k) => k.minutes);
    const kinds = bookable.length
      ? el('div', { class: 'bk-kinds', role: 'radiogroup', 'aria-label': 'Session' }, ...bookable.map((k) => {
        const radio = el('input', { type: 'radio', name: 'bk-kind', value: k.id, checked: k.id === kindId });
        radio.addEventListener('change', () => { kindId = k.id; refresh(); });
        return el('label', { class: 'bk-kind' }, radio, el('span', {}, k.name), el('small', {}, `${k.minutes} min`));
      }))
      : el('p', { class: 'bk-empty' }, "Booking isn't open yet.");
    const mine = current.requests.filter((r) => r.mine && r.end > now()).sort((a, b) => a.start - b.start);
    return [
      panel('Book a session', kinds, bookable.length ? el('p', { class: 'bk-hint' }, 'Pick an open slot on the calendar.') : ''),
      panel('Your requests', requestList(mine, 'None yet.')),
    ];
  }

  /* ---------- Clicking an event ---------- */
  function select(event: CalendarEvent): void {
    const info = event.data as { availability?: Availability; occurrence?: Interval; request?: BookingRequest; slot?: Interval } | undefined;
    if (info?.request) requestDialog(info.request);
    else if (info?.availability && info.occurrence) blockDialog(info.availability, info.occurrence);
    else if (info?.slot) slotDialog(info.slot);
  }

  function details(rows: [string, string | undefined][]): HTMLElement {
    return el('dl', { class: 'bk-details' }, ...rows.filter(([, v]) => v).flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v ?? '')]));
  }

  /** Add an available block: from a dragged span, or blank (today, 10:00–11:00). */
  function availabilityDialog(span: Interval | null): void {
    const start = span?.start ?? zonedTime(dayKeyOf(now(), timeZone), 600, timeZone);
    const end = span?.end ?? start + 3_600_000;
    const day = el('input', { type: 'date', name: 'day', required: true, value: dayKeyOf(start, timeZone) });
    const from = el('input', { type: 'time', name: 'from', required: true, step: 300, value: hhmm(minuteOfDay(start, timeZone)) });
    const to = el('input', { type: 'time', name: 'to', required: true, step: 300, value: hhmm(minuteOfDay(end, timeZone) || 1440) });
    const repeat = el('input', { type: 'checkbox', name: 'repeat' });
    const until = el('input', { type: 'date', name: 'until' });
    const untilRow = el('label', { class: 'ui-field', hidden: true }, el('span', {}, 'Until (optional)'), until);
    repeat.addEventListener('change', () => { untilRow.hidden = !repeat.checked; });
    const body = el('div', { class: 'ui-form' },
      el('label', { class: 'ui-field' }, el('span', {}, 'Day'), day),
      el('div', { class: 'ui-row' },
        el('label', { class: 'ui-field' }, el('span', {}, 'From'), from),
        el('label', { class: 'ui-field' }, el('span', {}, 'To'), to)),
      el('label', { class: 'ui-check' }, repeat, el('span', {}, 'Repeat every week')),
      untilRow,
    );
    openDialog({
      title: 'New availability',
      body,
      actions: [
        { label: 'Cancel' },
        {
          label: 'Add', kind: 'primary',
          run: () => {
            const startMinute = minutesOf(from.value);
            const endMinute = minutesOf(to.value) || 1440;
            if (!day.value || Number.isNaN(startMinute) || Number.isNaN(endMinute)) throw new Error('Fill in the day and both times.');
            if (endMinute <= startMinute) throw new Error('The end time must be after the start time.');
            if (repeat.checked && until.value && until.value < day.value) throw new Error('"Until" must be on or after the day.');
            return change(() => options.addAvailability?.({
              start: zonedTime(day.value, startMinute, timeZone), end: zonedTime(day.value, endMinute, timeZone),
              repeatWeekly: repeat.checked, until: repeat.checked && until.value ? until.value : null,
            }) ?? Promise.reject(new Error('Adding availability is not available here.')), 'Availability added.');
          },
        },
      ],
    });
  }

  function blockDialog(block: Availability, occurrence: Interval): void {
    const weekday = new Intl.DateTimeFormat(options.locale, { timeZone, weekday: 'long' }).format(new Date(block.start));
    openDialog({
      title: 'Available',
      body: details([
        ['When', when(occurrence)],
        ['Repeats', block.repeatWeekly ? `Every ${weekday}${block.until ? ` until ${block.until}` : ''}` : 'No'],
      ]),
      actions: [
        { label: 'Close' },
        {
          label: block.repeatWeekly ? 'Delete every week' : 'Delete', kind: 'danger',
          run: () => change(options.deleteAvailability && (() => options.deleteAvailability?.(block.id) ?? Promise.resolve()), 'Availability deleted.'),
        },
      ],
    });
  }

  function requestDialog(request: BookingRequest): void {
    const decide = (to: 'confirmed' | 'declined', done: string) => () =>
      change(options.decide && (() => options.decide?.(request.id, to) ?? Promise.resolve()), done);
    const actions = mode === 'admin' && request.status === 'pending'
      ? [{ label: 'Close' }, { label: 'Decline', kind: 'danger' as const, run: decide('declined', 'Request declined.') }, { label: 'Confirm', kind: 'primary' as const, run: decide('confirmed', 'Booking confirmed.') }]
      : mode === 'admin' && request.status === 'confirmed'
        ? [{ label: 'Close' }, { label: 'Cancel booking', kind: 'danger' as const, run: decide('declined', 'Booking cancelled.') }]
        : [{ label: 'Close' }];
    openDialog({
      title: `${kindName(request.kind)} · ${request.status}`,
      body: details([['When', when(request)], ['Who', request.who], ['Contact', request.contact], ['Note', request.note]]),
      actions,
    });
  }

  function slotDialog(slot: Interval): void {
    const kind = data?.kinds.find((k) => k.id === kindId);
    if (!kind) return;
    const note = el('textarea', { name: 'note', rows: 4, maxlength: NOTE_MAX, placeholder: 'What would you like to cover? (optional)' });
    openDialog({
      title: `Request ${kind.name}`,
      body: el('div', { class: 'ui-form' }, details([['When', when(slot)], ['Length', `${kind.minutes} min`]]),
        el('label', { class: 'ui-field' }, el('span', {}, 'Note'), note)),
      actions: [
        { label: 'Cancel' },
        {
          label: 'Send request', kind: 'primary',
          run: () => change(options.request && (() => options.request?.({ kind: kind.id, start: slot.start, end: slot.end, note: note.value.trim() }) ?? Promise.resolve()),
            "Request sent. You'll see it here once it's confirmed."),
        },
      ],
    });
  }

  function setMode(next: BookingMode): void {
    mode = next;
    calendar.element.dataset.mode = mode;
    refresh();
    void reload();
  }

  calendar.element.dataset.mode = mode;
  void reload();

  return {
    calendar,
    mode: () => mode,
    setMode,
    reload,
    destroy: () => calendar.destroy(),
  };
}
