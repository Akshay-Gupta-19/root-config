/**
 * The calendar view: an Outlook-style calendar with Day, Week and Month views. A toolbar (Today,
 * previous / next, the range title, a slot for the site's buttons, the view switch), a sidebar
 * with a small month to jump around (and a slot for the site's panels), and the main view: a
 * time grid with half-hour lines and a red "now" line (day and week), or a month of day cells with
 * event chips. Events come from the caller (`setEvents`); clicking one calls `onSelectEvent`, and
 * with `onCreate` the caller can drag across the time grid to pick a span (snapped to
 * `snapMinutes`). It stores nothing and calls no network: a site loads its events when
 * `onRangeChange` says what is on screen. Styles: css/calendar.css; colours are `--cal-*` tokens.
 * Keys (focus inside the calendar): T today, D / W / M the view, ← / → previous / next.
 */
import { append, el } from '../dom.js';
import {
  addDays, addMonths, dayKeyOf, minuteOfDay, monthGrid, parseDayKey, startOfDay, startOfMonth, weekDays,
  zonedTime, type DayKey,
} from './dates.js';
import { eventsOnDay, layoutDay, type CalendarEvent } from './layout.js';
import type { Interval } from './slots.js';

/** The three views. */
export type CalendarView = 'day' | 'week' | 'month';

/** The views in the order the switch shows them. */
export const CALENDAR_VIEWS: readonly CalendarView[] = ['day', 'week', 'month'];

/** What is on screen: the view, its first and last day (inclusive) and the instants they span. */
export interface CalendarRange extends Interval {
  view: CalendarView;
  from: DayKey;
  to: DayKey;
}

/** Settings for `createCalendar`; only `timeZone` is required. */
export interface CalendarOptions {
  /** The IANA time zone every day and time is shown in (e.g. 'Asia/Kolkata'). */
  timeZone: string;
  /** The locale for names and times (default: the browser's). */
  locale?: string;
  /** The view to open in (default 'week'; 'day' on a phone-width screen). */
  view?: CalendarView;
  /** The day to open on (default today). */
  date?: DayKey;
  /** The first day of the week (0 = Sunday, 1 = Monday, the default). */
  weekStartsOn?: number;
  /** The hour the time grid scrolls to when shown (default 8). */
  scrollToHour?: number;
  /** The step a drag on the time grid snaps to, in minutes (default 30). */
  snapMinutes?: number;
  /** The clock (default Date.now); tests and previews can pass their own. */
  now?: () => number;
  /** Events to show from the start. */
  events?: CalendarEvent[];
  /** Called with what is on screen: once at the start and after every move or view change. */
  onRangeChange?: (range: CalendarRange) => void;
  /** Called when an event is clicked (or chosen with Enter / Space). */
  onSelectEvent?: (event: CalendarEvent, element: HTMLElement) => void;
  /** Set it to let the viewer drag across the time grid to pick a span; called with that span. */
  onCreate?: (span: Interval) => void;
}

/** A mounted calendar. */
export interface Calendar {
  /** The calendar's root element (`.cal`). */
  element: HTMLElement;
  /** A slot under the small month for the site's own panels. */
  sidebar: HTMLElement;
  /** A slot in the toolbar, before the view switch, for the site's own buttons. */
  toolbarEnd: HTMLElement;
  /** Replaces the events shown. */
  setEvents: (events: CalendarEvent[]) => void;
  setView: (view: CalendarView) => void;
  /** Shows the range holding `day`. */
  goTo: (day: DayKey) => void;
  today: () => void;
  next: () => void;
  prev: () => void;
  /** What is on screen now. */
  range: () => CalendarRange;
  /** Stops the clock and removes the calendar. */
  destroy: () => void;
}

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** Mounts a calendar in `host` (its content is replaced). */
export function createCalendar(host: HTMLElement, options: CalendarOptions): Calendar {
  const { timeZone } = options;
  const locale = options.locale;
  const weekStartsOn = options.weekStartsOn ?? 1;
  const snap = options.snapMinutes ?? 30;
  const now = options.now ?? Date.now;
  const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches;
  let view: CalendarView = options.view ?? (narrow ? 'day' : 'week');
  if (narrow && view === 'week') view = 'day';
  let current: DayKey = options.date ?? dayKeyOf(now(), timeZone);
  let miniMonth = startOfMonth(current);
  let events: CalendarEvent[] = options.events ?? [];
  let scrolledTo: number | null = null; // the time grid's scroll position once the viewer scrolls (kept across redraws)

  /* ---------- Formatting (days are formatted at UTC noon, times in the calendar's zone) ---------- */
  const utcDate = (key: DayKey): Date => {
    const { year, month, day } = parseDayKey(key);
    return new Date(Date.UTC(year, month - 1, day, 12));
  };
  const dayFormat = (format: Intl.DateTimeFormatOptions) => {
    const formatter = new Intl.DateTimeFormat(locale, { ...format, timeZone: 'UTC' });
    return (key: DayKey): string => formatter.format(utcDate(key));
  };
  const weekdayShort = dayFormat({ weekday: 'short' });
  const monthYear = dayFormat({ month: 'long', year: 'numeric' });
  const monthDay = dayFormat({ month: 'short', day: 'numeric' });
  const longDay = dayFormat({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeFormatter = new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit' });
  const time = (ms: number): string => timeFormatter.format(new Date(ms));
  const hourFormatter = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', hour: 'numeric' });
  const hourLabel = (hour: number): string => hourFormatter.format(new Date(Date.UTC(2000, 0, 1, hour)));
  const todayKey = (): DayKey => dayKeyOf(now(), timeZone);

  /* ---------- What is on screen ---------- */
  function visibleDays(): DayKey[] {
    if (view === 'day') return [current];
    if (view === 'week') return weekDays(current, weekStartsOn);
    return monthGrid(current, weekStartsOn).flat();
  }
  function range(): CalendarRange {
    const days = visibleDays();
    const from = days[0] ?? current;
    const to = days[days.length - 1] ?? current;
    return { view, from, to, start: startOfDay(from, timeZone), end: startOfDay(addDays(to, 1), timeZone) };
  }
  function title(): string {
    if (view === 'day') return longDay(current);
    if (view === 'month') return monthYear(current);
    const days = weekDays(current, weekStartsOn);
    const first = days[0] ?? current;
    const last = days[6] ?? current;
    const year = parseDayKey(last).year;
    return `${monthDay(first)} – ${monthDay(last)}, ${year}`;
  }

  /* ---------- The frame ---------- */
  const titleEl = el('h2', { class: 'cal-title', 'aria-live': 'polite' });
  const toolbarEnd = el('div', { class: 'cal-toolbar-end' });
  const viewButtons = CALENDAR_VIEWS.map((name) =>
    el('button', { type: 'button', class: 'cal-view-btn', 'data-view': name, onclick: () => setView(name) },
      name[0]?.toUpperCase() + name.slice(1)));
  const mini = el('div', { class: 'cal-mini' });
  const sidebar = el('div', { class: 'cal-sidebar-extra' });
  const main = el('div', { class: 'cal-main' });
  const root = el('div', { class: 'cal' },
    el('div', { class: 'cal-toolbar' },
      el('button', { type: 'button', class: 'cal-btn cal-today', onclick: () => today() }, 'Today'),
      el('button', { type: 'button', class: 'cal-icon-btn', 'aria-label': 'Previous', title: 'Previous', onclick: () => prev() }, '‹'),
      el('button', { type: 'button', class: 'cal-icon-btn', 'aria-label': 'Next', title: 'Next', onclick: () => next() }, '›'),
      titleEl,
      toolbarEnd,
      el('div', { class: 'cal-views', role: 'group', 'aria-label': 'View' }, ...viewButtons),
    ),
    el('div', { class: 'cal-body' },
      el('aside', { class: 'cal-sidebar' }, mini, sidebar),
      main,
    ),
  );
  root.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
    const actions: Record<string, () => void> = {
      t: today, d: () => setView('day'), w: () => setView('week'), m: () => setView('month'),
      ArrowLeft: prev, ArrowRight: next,
    };
    const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });

  /* ---------- An event, as a block (time grid) or a chip (month) ---------- */
  function eventButton(event: CalendarEvent, className: string, label: Node[]): HTMLButtonElement {
    const button = el('button', {
      type: 'button', class: className, 'data-tone': event.tone ?? 'event', 'data-id': event.id,
      title: `${event.title}${event.subtitle ? ` · ${event.subtitle}` : ''} (${time(event.start)} – ${time(event.end)})`,
    });
    append(button, ...label);
    button.addEventListener('click', (click) => {
      click.stopPropagation();
      options.onSelectEvent?.(event, button);
    });
    button.addEventListener('pointerdown', (down) => down.stopPropagation()); // not a drag on the grid
    return button;
  }

  /* ---------- Day and week: the time grid ---------- */
  function renderTimeGrid(days: DayKey[]): HTMLElement {
    const today = todayKey();
    const head = el('div', { class: 'cal-grid-head' }, el('div', { class: 'cal-gutter-head' }));
    const body = el('div', { class: 'cal-grid-body' });
    const gutter = el('div', { class: 'cal-gutter', 'aria-hidden': 'true' });
    for (let hour = 1; hour < 24; hour++) {
      append(gutter, el('span', { class: 'cal-hour-label', style: `top:${(hour / 24) * 100}%` }, hourLabel(hour)));
    }
    append(body, gutter);
    for (const day of days) {
      append(head, el('div', { class: 'cal-day-head', 'data-today': day === today },
        el('span', { class: 'cal-day-name' }, weekdayShort(day)),
        el('button', { type: 'button', class: 'cal-day-num', 'aria-label': longDay(day), onclick: () => { current = day; setView('day'); } },
          String(parseDayKey(day).day)),
      ));
      const column = el('div', { class: 'cal-col', 'data-day': day, 'data-today': day === today });
      for (const segment of layoutDay(events, day, timeZone)) {
        const { event } = segment;
        const block = eventButton(event, 'cal-event', [
          el('span', { class: 'cal-event-title' }, event.title),
          el('span', { class: 'cal-event-time' }, `${time(event.start)} – ${time(event.end)}`),
          event.subtitle ? el('span', { class: 'cal-event-sub' }, event.subtitle) : document.createTextNode(''),
        ]);
        block.style.top = `${(segment.top / 1440) * 100}%`;
        block.style.height = `${((segment.bottom - segment.top) / 1440) * 100}%`;
        block.style.left = `${(segment.column / segment.columns) * 100}%`;
        block.style.width = `${100 / segment.columns}%`;
        if (segment.bottom - segment.top < 45) block.classList.add('cal-event--short');
        append(column, block);
      }
      if (day === today) append(column, el('div', { class: 'cal-now', 'aria-hidden': 'true' }));
      if (options.onCreate) enableDrag(column, day);
      append(body, column);
    }
    const scroll = el('div', { class: 'cal-scroll' }, body);
    const grid = el('div', { class: 'cal-grid', style: `--cal-days:${days.length}` }, head, scroll);
    placeNowLines(grid);
    requestAnimationFrame(() => {
      scroll.scrollTop = scrolledTo ?? (scroll.scrollHeight * (options.scrollToHour ?? 8)) / 24;
      scroll.addEventListener('scroll', () => { scrolledTo = scroll.scrollTop; }, { passive: true });
    });
    return grid;
  }

  function placeNowLines(scope: ParentNode): void {
    for (const line of scope.querySelectorAll<HTMLElement>('.cal-now')) {
      line.style.top = `${(minuteOfDay(now(), timeZone) / 1440) * 100}%`;
    }
  }

  /** Drag on an empty part of a day column to pick a span (snapped); a plain click picks one hour. */
  function enableDrag(column: HTMLElement, day: DayKey): void {
    const minuteAt = (clientY: number): number => {
      const box = column.getBoundingClientRect();
      const raw = ((clientY - box.top) / box.height) * 1440;
      return Math.max(0, Math.min(1440 - snap, Math.floor(raw / snap) * snap));
    };
    column.addEventListener('pointerdown', (down) => {
      if (down.button !== 0) return;
      down.preventDefault();
      const anchor = minuteAt(down.clientY);
      let from = anchor;
      let to = anchor + snap;
      let moved = false;
      const ghost = el('div', { class: 'cal-selection', 'aria-hidden': 'true' });
      const draw = (): void => {
        ghost.style.top = `${(from / 1440) * 100}%`;
        ghost.style.height = `${((to - from) / 1440) * 100}%`;
        ghost.textContent = `${time(zonedTime(day, from, timeZone))} – ${time(zonedTime(day, to, timeZone))}`;
      };
      draw();
      append(column, ghost);
      column.setPointerCapture(down.pointerId);
      const move = (event: PointerEvent): void => {
        const at = minuteAt(event.clientY);
        if (at !== anchor) moved = true;
        from = Math.min(anchor, at);
        to = Math.max(anchor, at) + snap;
        draw();
      };
      const up = (): void => {
        column.removeEventListener('pointermove', move);
        column.removeEventListener('pointerup', up);
        column.removeEventListener('pointercancel', cancel);
        ghost.remove();
        if (!moved) to = Math.min(1440, from + Math.max(snap, 60));
        options.onCreate?.({ start: zonedTime(day, from, timeZone), end: zonedTime(day, to, timeZone) });
      };
      const cancel = (): void => {
        column.removeEventListener('pointermove', move);
        column.removeEventListener('pointerup', up);
        column.removeEventListener('pointercancel', cancel);
        ghost.remove();
      };
      column.addEventListener('pointermove', move);
      column.addEventListener('pointerup', up);
      column.addEventListener('pointercancel', cancel);
    });
  }

  /* ---------- Month: day cells with chips ---------- */
  const CHIPS = 3;
  function renderMonth(): HTMLElement {
    const today = todayKey();
    const month = current.slice(0, 7);
    const weeks = monthGrid(current, weekStartsOn);
    const head = el('div', { class: 'cal-month-head' },
      ...(weeks[0] ?? []).map((day) => el('div', { class: 'cal-month-dayname' }, weekdayShort(day))));
    const body = el('div', { class: 'cal-month-body', style: `--cal-weeks:${weeks.length}` });
    for (const week of weeks) {
      for (const day of week) {
        const dayEvents = eventsOnDay(events, day, timeZone);
        const openDay = (): void => { current = day; setView('day'); };
        const cell = el('div', { class: 'cal-cell', 'data-day': day, 'data-today': day === today, 'data-outside': day.slice(0, 7) !== month },
          el('button', { type: 'button', class: 'cal-cell-num', 'aria-label': longDay(day), onclick: openDay },
            parseDayKey(day).day === 1 ? monthDay(day) : String(parseDayKey(day).day)),
        );
        for (const event of dayEvents.slice(0, CHIPS)) {
          append(cell, eventButton(event, 'cal-chip', [
            el('span', { class: 'cal-chip-dot', 'aria-hidden': 'true' }),
            el('span', { class: 'cal-chip-time' }, time(Math.max(event.start, startOfDay(day, timeZone)))),
            el('span', { class: 'cal-chip-title' }, event.title),
          ]));
        }
        if (dayEvents.length > CHIPS) {
          append(cell, el('button', { type: 'button', class: 'cal-more', onclick: openDay }, `+${dayEvents.length - CHIPS} more`));
        }
        append(body, cell);
      }
    }
    return el('div', { class: 'cal-month' }, head, body);
  }

  /* ---------- The small month in the sidebar ---------- */
  function renderMini(): void {
    const { from, to } = range();
    const today = todayKey();
    const month = miniMonth.slice(0, 7);
    const weeks = monthGrid(miniMonth, weekStartsOn);
    const grid = el('div', { class: 'cal-mini-grid', role: 'grid', 'aria-label': monthYear(miniMonth) },
      ...(weeks[0] ?? []).map((day) => el('span', { class: 'cal-mini-dayname', 'aria-hidden': 'true' }, weekdayShort(day).slice(0, 2))));
    for (const day of weeks.flat()) {
      append(grid, el('button', {
        type: 'button', class: 'cal-mini-day', 'aria-label': longDay(day),
        'data-today': day === today, 'data-outside': day.slice(0, 7) !== month,
        'data-selected': day >= from && day <= to && (view !== 'month' || day.slice(0, 7) === current.slice(0, 7)),
        onclick: () => goTo(day),
      }, String(parseDayKey(day).day)));
    }
    mini.replaceChildren(
      el('div', { class: 'cal-mini-head' },
        el('span', { class: 'cal-mini-title' }, monthYear(miniMonth)),
        el('button', { type: 'button', class: 'cal-icon-btn cal-icon-btn--sm', 'aria-label': 'Previous month', onclick: () => { miniMonth = addMonths(miniMonth, -1); renderMini(); } }, '‹'),
        el('button', { type: 'button', class: 'cal-icon-btn cal-icon-btn--sm', 'aria-label': 'Next month', onclick: () => { miniMonth = addMonths(miniMonth, 1); renderMini(); } }, '›'),
      ),
      grid,
    );
  }

  /* ---------- Rendering and moving ---------- */
  function render(): void {
    root.dataset.view = view;
    titleEl.textContent = title();
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
    main.replaceChildren(view === 'month' ? renderMonth() : renderTimeGrid(visibleDays()));
    renderMini();
  }
  function moved(): void {
    miniMonth = startOfMonth(current);
    render();
    options.onRangeChange?.(range());
  }
  function setView(next: CalendarView): void {
    view = next;
    moved();
  }
  function goTo(day: DayKey): void {
    current = day;
    moved();
  }
  function step(direction: 1 | -1): void {
    current = view === 'month' ? addMonths(startOfMonth(current), direction) : addDays(current, direction * (view === 'week' ? 7 : 1));
    moved();
  }
  const today = (): void => goTo(todayKey());
  const next = (): void => step(1);
  const prev = (): void => step(-1);

  // Every minute: move the "now" line; at midnight, draw the new day.
  let shownToday = todayKey();
  const clock = setInterval(() => {
    if (todayKey() !== shownToday) {
      shownToday = todayKey();
      render();
    } else placeNowLines(main);
  }, 60_000);

  host.replaceChildren(root);
  render();
  queueMicrotask(() => options.onRangeChange?.(range()));

  return {
    element: root,
    sidebar,
    toolbarEnd,
    setEvents(list) {
      events = list;
      render();
    },
    setView,
    goTo,
    today,
    next,
    prev,
    range,
    destroy() {
      clearInterval(clock);
      root.remove();
    },
  };
}
