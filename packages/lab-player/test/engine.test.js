// The engine (src/trace.ts, src/player.ts), moved from the DSA Visual Lab's tests: the frame
// recorder every demo uses and the playback state machine. Both run without a browser; the player's
// timer is Node's mock clock.
import assert from "node:assert/strict";
import { beforeEach, describe, mock, test } from "node:test";
import { createTrace, createPlayer, SPEEDS } from "../dist/index.js";

describe("recording frames (createTrace)", () => {
  test("each step is a snapshot: changing the algorithm's arrays later doesn't change it", () => {
    const values = [3, 1, 2];
    const vars = { i: 0 };
    const t = createTrace();
    t.step("first", { vars, arr: { values } });
    values[0] = 99;
    vars.i = 5;
    t.step("second", { vars, arr: { values } });
    assert.deepEqual(t.frames[0].state.arr.values, [3, 1, 2]);
    assert.deepEqual(t.frames[0].vars, { i: 0 });
    assert.deepEqual(t.frames[1].state.arr.values, [99, 1, 2]);
  });

  test("a panel's state carries over until a step passes it again", () => {
    const t = createTrace({ arr: { values: [1, 2] } });
    t.step("only the map changes", { map: { entries: [] } });
    assert.deepEqual(t.frames[0].state, { arr: { values: [1, 2] }, map: { entries: [] } });
  });

  test("a panel's new state replaces the old one, it is never merged (a highlight goes once unmentioned)", () => {
    const t = createTrace();
    t.step("highlight", { arr: { values: [1, 2], tones: { 0: "current" } } });
    t.step("no highlight", { arr: { values: [1, 2] } });
    assert.equal(t.frames[1].state.arr.tones, undefined);
  });

  test("defaults: no line, no variables, an info note; step() returns the frame's index", () => {
    const t = createTrace();
    assert.equal(t.step("a"), 0);
    assert.equal(t.step("b", { line: [3, 4], tone: "success" }), 1);
    assert.deepEqual(t.frames[0], { note: "a", line: null, vars: {}, tone: "info", state: {} });
    assert.deepEqual(t.frames[1].line, [3, 4]);
    assert.equal(t.frames[1].tone, "success");
  });

  test("op: the operation carries over to the next steps until one names another, null hides it", () => {
    const t = createTrace();
    t.step("before any op");
    t.step("first call", { op: "push(3)" });
    t.step("still push");
    t.op("pop()"); // set without recording a step
    t.step("popping");
    t.step("summary", { op: null });
    assert.deepEqual(
      t.frames.map((f) => f.op),
      [undefined, "push(3)", "push(3)", "pop()", null]
    );
    assert.equal("op" in t.frames[0], false, "a step before any op leaves it out, so the run's own call shows");
  });

  test("current() gives a copy of a panel's latest state, safe to change for the next step", () => {
    const t = createTrace();
    t.step("start", { arr: { values: [1, 2] } });
    const next = t.current("arr");
    next.values.push(3);
    assert.deepEqual(t.frames[0].state.arr.values, [1, 2]);
    assert.equal(t.current("missing"), undefined);
  });
});

describe("playback (createPlayer)", () => {
  const frames = ["a", "b", "c", "d"].map((note) => ({ note }));
  let player, events;
  const lastFrame = () => events.filter((e) => e.type === "frame").at(-1);

  beforeEach(() => {
    mock.timers.reset();
    mock.timers.enable({ apis: ["setTimeout"] });
    player = createPlayer({ interval: 1000 });
    events = [];
    player.on((event) => events.push(event));
    player.load(frames);
  });

  test("loading shows the first frame at once", () => {
    assert.equal(player.index, 0);
    assert.equal(player.total, 4);
    assert.deepEqual(lastFrame(), { type: "frame", index: 0, frame: frames[0], total: 4, direction: 0, instant: true });
  });

  test("next and prev step one frame, animated, and stop at either end", () => {
    player.next();
    assert.deepEqual([lastFrame().index, lastFrame().direction, lastFrame().instant], [1, 1, false]);
    player.prev();
    assert.deepEqual([lastFrame().index, lastFrame().direction], [0, -1]);
    player.prev();
    assert.equal(player.index, 0);
  });

  test("a jump of more than one step is drawn instantly; jumps are clamped to the frames", () => {
    player.seek(3);
    assert.deepEqual([lastFrame().index, lastFrame().instant], [3, true]);
    player.seek(99);
    assert.equal(player.index, 3);
    player.seek(-5);
    assert.equal(player.index, 0);
  });

  test("playing steps once per interval and pauses itself on the last frame", () => {
    player.play();
    assert.equal(player.playing, true);
    mock.timers.tick(1000);
    assert.equal(player.index, 1);
    mock.timers.tick(1000); // one tick per step: the next step's timer is set when this one fires
    mock.timers.tick(1000);
    assert.equal(player.index, 3);
    assert.equal(player.playing, false);
    mock.timers.tick(5000);
    assert.equal(player.index, 3);
  });

  test("play on the last frame starts again from the first", () => {
    player.end();
    player.play();
    assert.equal(player.index, 0);
    assert.equal(player.playing, true);
  });

  test("speed divides the interval, even while playing", () => {
    assert.deepEqual(SPEEDS, [0.5, 0.75, 1, 1.5, 2, 3]);
    player.play();
    player.setSpeed(2);
    mock.timers.tick(500);
    assert.equal(player.index, 1);
    assert.deepEqual(events.filter((e) => e.type === "state").at(-1), { type: "state", playing: true, speed: 2 });
  });

  test("stepping, seeking or loading pauses playback", () => {
    for (const action of [() => player.next(), () => player.prev(), () => player.seek(2), () => player.reset(), () => player.load(frames)]) {
      player.play();
      action();
      assert.equal(player.playing, false);
      mock.timers.tick(5000);
    }
  });

  test("one frame, or none, can't be played; seeking an empty player does nothing", () => {
    player.load([{ note: "only" }]);
    player.play();
    assert.equal(player.playing, false);
    player.load([]);
    player.seek(1);
    assert.equal(player.index, 0);
  });

  test("unsubscribing and destroy stop the events", () => {
    const off = player.on(() => assert.fail("unsubscribed listener called"));
    off();
    player.next();
    player.play();
    player.destroy();
    const count = events.length;
    mock.timers.tick(5000);
    assert.equal(events.length, count);
  });
});
