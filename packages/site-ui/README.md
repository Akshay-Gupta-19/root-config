# @akshayanimateddsa/site-ui

Generic components for websites: plain DOM, no framework, no runtime dependencies. Every colour is a
CSS variable, so each site gives them its own theme. Every export is listed with one line in
[`catalogue.json`](catalogue.json).

- **Calendar** (`createCalendar`): an Outlook-style calendar with Day, Week and Month views. It has a
  toolbar, a small month in a sidebar, a time grid with half-hour lines and a red "now" line,
  overlapping events side by side, and drag to pick a span.
- **Booking calendar** (`createBookingCalendar`): the calendar with 1:1 session booking on top.
  - The admin adds available time (one-off or weekly), sets each session kind's length, and confirms
    or declines requests.
  - A student picks a session kind, sees the open slots and requests one.
- **Slots** (`openSlots`, `isOpenSlot`, also at `@akshayanimateddsa/site-ui/slots` for servers):
  available time cut into sessions, minus taken times. A server checks a request with the same code.
- **Dialog** (`openDialog`): a modal on `<dialog>` with async action buttons.

## Using it
```bash
npm install @akshayanimateddsa/site-ui
```

```html
<link rel="stylesheet" href="…/site-ui/css/calendar.css">
<link rel="stylesheet" href="…/site-ui/css/dialog.css">
<div id="calendar"></div>
```

```js
import { createBookingCalendar } from '@akshayanimateddsa/site-ui';

createBookingCalendar(document.getElementById('calendar'), {
  mode: 'admin',                      // or 'student'
  previewStudent: true,               // admin: a switch to see the student view
  timeZone: 'Asia/Kolkata',
  load: (mode) => fetch(`/api/booking?as=${mode}`).then((r) => r.json()),   // { kinds, availability, requests }
  addAvailability: (block) => post('/api/availability', block),
  deleteAvailability: (id) => del(`/api/availability/${id}`),
  saveMinutes: (kind, minutes) => put(`/api/kinds/${kind}`, { minutes }),
  decide: (id, status) => post(`/api/requests/${id}/${status}`),
  request: (req) => post('/api/requests', req),
  notify: (message) => toast(message),
});
```

All times are epoch milliseconds and days are `'YYYY-MM-DD'`, read in the `timeZone` you pass.

## Theming
Set the `--cal-*` tokens on `.cal`, or on `:root` so the dialogs (which sit in `body`) pick them up
too. For example, a dark theme:

```css
:root {
  --cal-bg: #060a18; --cal-surface: #0b1228; --cal-surface-2: #0f1833; --cal-hover: #142045;
  --cal-border: rgba(125,165,255,.14); --cal-border-strong: rgba(125,165,255,.28); --cal-line: rgba(125,165,255,.06);
  --cal-text: #e8edfb; --cal-muted: #9aa6c7; --cal-dim: #6a769a;
  --cal-accent: #22d3ee; --cal-accent-contrast: #060a18; --cal-accent-soft: rgba(34,211,238,.14);
  --cal-tone-available: #34d399; --cal-tone-pending: #fbbf24; --cal-tone-confirmed: #a78bfa;
}
```

The full list of tokens, with their Outlook-like light defaults, is at the top of `css/calendar.css`.

## Layout
```
src/index.ts              exports (one line each in catalogue.json)
src/calendar/dates.ts     days, weeks, month grids, wall-clock times in a time zone (pure)
src/calendar/slots.ts     availability → occurrences → open slots; the server check (pure)
src/calendar/layout.ts    events of a day, time-grid spans and overlap columns (pure)
src/calendar/calendar.ts  the calendar view
src/calendar/booking.ts   the booking calendar
src/dialog.ts             the modal dialog
src/dom.ts                internal element helper (text only, never HTML)
css/calendar.css          calendar and booking styles, --cal-* tokens
css/dialog.css            dialog styles, --ui-* tokens
```

## Before changing it
Rules for agents are in [`AGENT.md`](AGENT.md). Run `npm test -w @akshayanimateddsa/site-ui`, then
check the change in a site page that uses the components before releasing it. Adding or removing an
export or a stylesheet is a minor bump while the package is `0.x`.
