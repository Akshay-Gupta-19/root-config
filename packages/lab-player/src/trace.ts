/**
 * Records the frames of an algorithm run: the demo runs its algorithm once, calling `step` at each
 * moment worth showing, and hands `frames` to the visualizer (or a player).
 *
 *   const t = createTrace({ arr: { values } });
 *   t.step('Compare arr[0] and arr[1]', { line: 4, vars: { i: 0 }, arr: { values, tones: { 0: 'compare' } } });
 *   viz.load(t.frames);
 *
 * Every step stores a deep copy, so the algorithm can keep mutating its own variables. A panel's
 * state carries over from the previous step until a step passes a new one for that key; state is
 * replaced, never merged, so a highlight disappears as soon as a step stops mentioning it. State
 * must be cloneable (`structuredClone`): no functions, DOM nodes or class instances with methods.
 *
 * `op` names the operation a step belongs to, e.g. "add(5)" or "sumRange(0, 2)": the visualizer
 * pops it up above the drawing and keeps it there while the following steps carry the same `op`.
 * It carries over like panel state; `null` hides it. Steps recorded before any `op` leave it out,
 * so the run's own call (`load(frames, { op })`) shows instead.
 */

/** The colour of a step's explanation. */
export type NoteTone = 'info' | 'success' | 'warn' | 'error';

/** One recorded step: a complete snapshot, so showing it never depends on the step before. */
export interface Frame {
  /** The explanation shown for this step (`code` and **bold** allowed). */
  note: string;
  /** 1-based line(s) of the code panel's source to highlight. */
  line: number | number[] | null;
  /** Variables in scope, shown in the variables panel. */
  vars: Record<string, unknown>;
  tone: NoteTone;
  /** The operation being run (left out before the first one; `null` hides it). */
  op?: string | null;
  /** Each panel's state, by panel key. */
  state: Record<string, unknown>;
}

/** What `step` takes besides the note: the fields below, and any other key is a panel's new state. */
export interface StepOptions {
  line?: number | number[] | null;
  vars?: Record<string, unknown>;
  tone?: NoteTone;
  op?: string | null;
  [panel: string]: unknown;
}

export interface Trace {
  /** The frames recorded so far (pass to `load`). */
  readonly frames: Frame[];
  /** Records a step; returns its index. */
  step(note: string, options?: StepOptions): number;
  /** Sets the operation for the steps that follow, without recording a step (null hides it). */
  op(text: string | null): void;
  /** A panel's state as of the last step (a copy you may change for the next one). */
  current(key: string): unknown;
}

const clone = <T>(value: T): T => (value === undefined ? value : structuredClone(value));

/** Starts recording; `initialState` is each panel's state before the first step. */
export function createTrace(initialState: Record<string, unknown> = {}): Trace {
  const frames: Frame[] = [];
  let state = clone(initialState);
  let op: string | null | undefined;

  return {
    frames,
    step(note, { line = null, vars = {}, tone = 'info', op: nextOp, ...panelStates } = {}) {
      state = { ...state, ...clone(panelStates) };
      if (nextOp !== undefined) op = nextOp;
      frames.push({ note, line, vars: clone(vars), tone, ...(op === undefined ? {} : { op }), state });
      return frames.length - 1;
    },
    op(text) {
      op = text;
    },
    current(key) {
      return clone(state[key]);
    },
  };
}
