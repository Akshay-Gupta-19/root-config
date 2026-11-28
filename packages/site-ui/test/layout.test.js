// Where events go (src/calendar/layout.ts): the events of a day, their minutes on the time grid,
// and overlapping events placed in columns side by side.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventsOnDay, layoutDay, zonedTime } from '../dist/index.js';

const IST = 'Asia/Kolkata';
const DAY = '2026-11-28';
const ev = (id, from, to, day = DAY) => ({ id, title: id, start: zonedTime(day, from, IST), end: zonedTime(day, to, IST) });
const byId = (segments) => Object.fromEntries(segments.map((s) => [s.event.id, s]));

test('only events touching the day are on it, earliest first', () => {
  const list = [ev('b', 600, 660), ev('a', 540, 600), ev('other', 600, 660, '2026-11-29')];
  assert.deepEqual(eventsOnDay(list, DAY, IST).map((e) => e.id), ['a', 'b']);
});

test('an event sits at its minutes from midnight, in one column when alone', () => {
  const [segment] = layoutDay([ev('a', 9 * 60, 10 * 60 + 30)], DAY, IST);
  assert.deepEqual([segment.top, segment.bottom, segment.column, segment.columns], [540, 630, 0, 1]);
});

test('overlapping events go side by side and share a column count', () => {
  const s = byId(layoutDay([ev('a', 540, 660), ev('b', 600, 720), ev('c', 690, 750), ev('later', 900, 960)], DAY, IST));
  assert.deepEqual([s.a.column, s.b.column, s.c.column], [0, 1, 0]); // c reuses a's column once a has ended
  assert.deepEqual([s.a.columns, s.b.columns, s.c.columns], [2, 2, 2]);
  assert.deepEqual([s.later.column, s.later.columns], [0, 1]); // a separate group
});

test('an event crossing midnight is clipped to each day and marked as continuing', () => {
  const late = { id: 'late', title: 'late', start: zonedTime(DAY, 23 * 60, IST), end: zonedTime('2026-11-29', 60, IST) };
  const [first] = layoutDay([late], DAY, IST);
  const [second] = layoutDay([late], '2026-11-29', IST);
  assert.deepEqual([first.top, first.bottom, first.continuesAfter, first.continuesBefore], [1380, 1440, true, false]);
  assert.deepEqual([second.top, second.bottom, second.continuesBefore], [0, 60, true]);
});

test('a very short event is drawn at least 15 minutes tall', () => {
  const [segment] = layoutDay([ev('tiny', 600, 605)], DAY, IST);
  assert.equal(segment.bottom - segment.top, 15);
});
