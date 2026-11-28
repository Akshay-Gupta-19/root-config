// Booking slots (src/calendar/slots.ts): available blocks expanded week by week, cut into sessions,
// minus taken times and the past; and the server's check that a requested slot is really open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandAvailability, isOpenSlot, openSlots, overlaps, zonedTime, startOfDay, addDays } from '../dist/index.js';

const IST = 'Asia/Kolkata';
const at = (day, hhmm) => zonedTime(day, Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)), IST);
const span = (from, to) => ({ start: startOfDay(from, IST), end: startOfDay(addDays(to, 1), IST) });
const NOW = at('2026-11-01', '00:00');
const times = (slots) => slots.map((s) => new Date(s.start).toISOString().slice(0, 16));

const saturdays = { id: 'sat', start: at('2026-11-07', '10:00'), end: at('2026-11-07', '12:00'), repeatWeekly: true, until: '2026-11-28' };
const once = { id: 'once', start: at('2026-11-10', '18:00'), end: at('2026-11-10', '19:00') };

test('touching spans do not overlap; sharing a minute does', () => {
  assert.equal(overlaps({ start: 0, end: 10 }, { start: 10, end: 20 }), false);
  assert.equal(overlaps({ start: 0, end: 11 }, { start: 10, end: 20 }), true);
});

test('a weekly block comes back every week at the same wall time, until its last day', () => {
  const found = expandAvailability([saturdays], span('2026-11-01', '2026-12-31'), IST);
  assert.deepEqual(found.map((o) => o.start), ['2026-11-07', '2026-11-14', '2026-11-21', '2026-11-28'].map((d) => at(d, '10:00')));
  for (const o of found) assert.equal(o.end - o.start, 2 * 3_600_000);
});

test('a weekly block with no last day keeps going, and only occurrences in the span come back', () => {
  const forever = { ...saturdays, until: null };
  const found = expandAvailability([forever], span('2027-06-01', '2027-06-30'), IST);
  assert.equal(found.length, 4);
  assert.equal(found[0].start, at('2027-06-05', '10:00'));
});

test('a one-off block comes back only in a span it overlaps', () => {
  assert.equal(expandAvailability([once], span('2026-11-10', '2026-11-10'), IST).length, 1);
  assert.equal(expandAvailability([once], span('2026-11-11', '2026-11-20'), IST).length, 0);
});

test('a block that ends before it starts is ignored', () => {
  assert.equal(expandAvailability([{ id: 'bad', start: 10, end: 5 }], { start: 0, end: 100 }, IST).length, 0);
});

test('open slots cut each block into back-to-back sessions and drop a short remainder', () => {
  const slots = openSlots({ availability: [saturdays], busy: [], minutes: 45, range: span('2026-11-07', '2026-11-07'), now: NOW, timeZone: IST });
  // 10:00–10:45, 10:45–11:30; 11:30–12:00 is too short for 45 minutes.
  assert.deepEqual(slots, [
    { start: at('2026-11-07', '10:00'), end: at('2026-11-07', '10:45') },
    { start: at('2026-11-07', '10:45'), end: at('2026-11-07', '11:30') },
  ]);
});

test('a taken time removes every slot it overlaps', () => {
  const busy = [{ start: at('2026-11-07', '10:15'), end: at('2026-11-07', '10:45') }];
  const slots = openSlots({ availability: [saturdays], busy, minutes: 30, range: span('2026-11-07', '2026-11-07'), now: NOW, timeZone: IST });
  // Slots are cut from the block's start: 10:00 and 10:30 overlap the taken time, 11:00 and 11:30 don't.
  assert.deepEqual(times(slots), times([{ start: at('2026-11-07', '11:00') }, { start: at('2026-11-07', '11:30') }]));
});

test('slots that start in the past are left out', () => {
  const slots = openSlots({ availability: [saturdays], busy: [], minutes: 60, range: span('2026-11-07', '2026-11-07'), now: at('2026-11-07', '10:30'), timeZone: IST });
  assert.deepEqual(slots, [{ start: at('2026-11-07', '11:00'), end: at('2026-11-07', '12:00') }]);
});

test('two overlapping blocks give each slot start once', () => {
  const again = { id: 'again', start: at('2026-11-07', '10:00'), end: at('2026-11-07', '11:00') };
  const slots = openSlots({ availability: [saturdays, again], busy: [], minutes: 60, range: span('2026-11-07', '2026-11-07'), now: NOW, timeZone: IST });
  assert.equal(slots.length, 2);
});

test('no length, or a length of zero, gives no slots', () => {
  assert.deepEqual(openSlots({ availability: [saturdays], busy: [], minutes: 0, range: span('2026-11-07', '2026-11-07'), now: NOW, timeZone: IST }), []);
});

test('the server check accepts exactly an open slot and refuses anything else', () => {
  const query = { availability: [saturdays, once], busy: [], minutes: 30, now: NOW, timeZone: IST };
  assert.equal(isOpenSlot({ start: at('2026-11-14', '11:30'), end: at('2026-11-14', '12:00') }, query), true);
  assert.equal(isOpenSlot({ start: at('2026-11-10', '18:30'), end: at('2026-11-10', '19:00') }, query), true);
  // Off the 30-minute grid, the wrong length, outside the availability, after its last week, or taken.
  assert.equal(isOpenSlot({ start: at('2026-11-14', '10:10'), end: at('2026-11-14', '10:40') }, query), false);
  assert.equal(isOpenSlot({ start: at('2026-11-14', '10:00'), end: at('2026-11-14', '11:00') }, query), false);
  assert.equal(isOpenSlot({ start: at('2026-11-14', '13:00'), end: at('2026-11-14', '13:30') }, query), false);
  assert.equal(isOpenSlot({ start: at('2026-12-05', '10:00'), end: at('2026-12-05', '10:30') }, query), false);
  const taken = { ...query, busy: [{ start: at('2026-11-14', '11:30'), end: at('2026-11-14', '12:00') }] };
  assert.equal(isOpenSlot({ start: at('2026-11-14', '11:30'), end: at('2026-11-14', '12:00') }, taken), false);
});
