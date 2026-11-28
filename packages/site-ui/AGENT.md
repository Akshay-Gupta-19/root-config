# AGENT.md — packages/site-ui (`@akshayanimateddsa/site-ui`)

Read the root [`../../AGENT.md`](../../AGENT.md) first; these rules add to it. What the package is
and how to use it: [`README.md`](README.md).

- **Every export is listed in [`catalogue.json`](catalogue.json)** with one line: look there before
  writing a new site component.

## Purpose
The broad package for generic **site** components (the broad-package rule in the root `AGENT.md`): anything a website of the
workspace shows that isn't a lab view (`visual-lab`) or part of the lab player (`lab-player`). A new
generic site component goes here as a folder or file, not into a new package. Today: the calendar
(`src/calendar/`: the view, the booking calendar, and the pure date, slot and layout maths) and the
modal dialog (`src/dialog.ts`).

Not responsible for: storing or loading data, prices, auth, or any server. A site passes its data
in and gets callbacks out; its server keeps the rules that must be trusted.

## Invariants
- Generic only: no site's routes, brand, copy about a product, prices or sign-in. Words a person
  reads in the components are plain and generic ("Available", "Request", "Session lengths").
- Nothing touches the DOM at import time (`test/catalogue.test.js` imports the package in Node).
  The pure modules (`calendar/dates.ts`, `slots.ts`, `layout.ts`) never touch the DOM at all: a
  site's server imports `slots.ts` (`@akshayanimateddsa/site-ui/slots`) to check a booking with the
  same rule the page shows.
- Text from data goes in as text nodes (`dom.ts`), never as HTML.
- Days are `'YYYY-MM-DD'` strings and instants epoch milliseconds; every wall-clock reading takes
  the time zone as an argument (`Intl`), never the machine's zone.
- Every colour, font and size is a CSS token (`--cal-*` in `css/calendar.css`, `--ui-*` in
  `css/dialog.css`, defaulting to the calendar's): a site themes the components by setting tokens,
  never by overriding rules. A new colour is a new token with a default.
- No runtime dependencies.

## Gotchas
- The dialog lives in `document.body`, outside `.cal`: a site sets the tokens it changes on `:root`
  (or `.ui-dialog`) too, not only on `.cal`.
- `openSlots` cuts each available block from its start; a slot taken in the middle removes only the
  slots it overlaps. `isOpenSlot` is exact: the same start, end and length as an open slot.
- A weekly block repeats at the same wall time in the given zone; in a zone with daylight saving the
  instant moves by an hour across the change (the tests pin both sides).
- Under 760px the small month is hidden and the sidebar panels move below the calendar (above it in
  the booking calendar's student mode, so the session is picked first); under 640px a calendar opened
  in week view starts in day view.

## Testing
`npm test -w @akshayanimateddsa/site-ui`: the date maths (India and a daylight-saving zone), slots
and the server check, the time-grid layout, the catalogue. The views need a browser: check a change
in a site's page that uses them (the DSA site's `/calendar` browser test) before releasing it.
