// The calendar's date maths (src/calendar/dates.ts): days as 'YYYY-MM-DD', weeks and month grids,
// and wall-clock times in a time zone, one without daylight saving (India) and one with it (New York).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, addMonths, dayKeyOf, daysBetween, minuteOfDay, monthGrid, startOfDay, startOfWeek, weekDays, weekdayOf,
  zonedParts, zonedTime, parseDayKey,
} from '../dist/index.js';

const IST = 'Asia/Kolkata';
const NY = 'America/New_York';

test('adding days crosses months and years', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('adding months keeps the day inside a shorter month', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-11-15', 2), '2027-01-15');
  assert.equal(addMonths('2026-03-31', -1), '2026-02-28');
});

test('weekdays, weeks and day counts follow the calendar', () => {
  assert.equal(weekdayOf('2026-11-28'), 6); // a Saturday
  assert.equal(startOfWeek('2026-11-28'), '2026-11-23'); // Monday
  assert.equal(startOfWeek('2026-11-28', 0), '2026-11-22'); // Sunday start
  assert.equal(startOfWeek('2026-11-23'), '2026-11-23');
  assert.deepEqual(weekDays('2026-11-28').slice(0, 2), ['2026-11-23', '2026-11-24']);
  assert.equal(daysBetween('2026-11-28', '2026-12-05'), 7);
  assert.equal(daysBetween('2026-12-05', '2026-11-28'), -7);
});

test('a month grid is whole weeks that cover the month and start on the week start', () => {
  const grid = monthGrid('2026-11-10');
  assert.ok(grid.length >= 4 && grid.length <= 6);
  for (const week of grid) {
    assert.equal(week.length, 7);
    assert.equal(weekdayOf(week[0]), 1);
  }
  const days = grid.flat();
  assert.ok(days.includes('2026-11-01') && days.includes('2026-11-30'));
  assert.equal(days[0], '2026-10-26');
  assert.equal(days.at(-1), '2026-12-06');
  assert.equal(monthGrid('2021-02-01').length, 4); // Feb 2021 starts on a Monday and has 28 days
});

test('a malformed day is refused', () => {
  assert.throws(() => parseDayKey('2026-1-5'), /Not a day/);
});

test('India: a wall time and its instant round-trip, 5:30 ahead of UTC', () => {
  const at = zonedTime('2026-11-28', 10 * 60, IST);
  assert.equal(new Date(at).toISOString(), '2026-11-28T04:30:00.000Z');
  assert.equal(dayKeyOf(at, IST), '2026-11-28');
  assert.equal(minuteOfDay(at, IST), 600);
  assert.deepEqual(zonedParts(at, IST), { year: 2026, month: 11, day: 28, hour: 10, minute: 0, weekday: 6 });
});

test('the day an instant falls on depends on the time zone', () => {
  const lateUtc = Date.parse('2026-11-28T20:00:00Z');
  assert.equal(dayKeyOf(lateUtc, 'UTC'), '2026-11-28');
  assert.equal(dayKeyOf(lateUtc, IST), '2026-11-29');
  assert.equal(startOfDay('2026-11-29', IST), Date.parse('2026-11-28T18:30:00Z'));
});

test('New York: times on both sides of a daylight-saving change land on the right instant', () => {
  assert.equal(new Date(zonedTime('2026-03-07', 600, NY)).toISOString(), '2026-03-07T15:00:00.000Z'); // EST
  assert.equal(new Date(zonedTime('2026-03-09', 600, NY)).toISOString(), '2026-03-09T14:00:00.000Z'); // EDT
  // 2:30 AM doesn't exist on 2026-03-08: it resolves to the instant after the jump.
  const skipped = zonedTime('2026-03-08', 150, NY);
  assert.equal(minuteOfDay(skipped, NY), 210);
  // A day with the jump is 23 hours long.
  assert.equal(startOfDay('2026-03-09', NY) - startOfDay('2026-03-08', NY), 23 * 3_600_000);
});

test('minutes past 1440 roll into the next day', () => {
  assert.equal(zonedTime('2026-11-28', 1440, IST), startOfDay('2026-11-29', IST));
});
