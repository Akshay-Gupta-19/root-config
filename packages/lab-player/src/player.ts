/**
 * Playback state machine over a fixed list of frames (play, pause, step, seek, speed). It owns no
 * DOM: the visualizer and the controls listen to its events.
 *
 * Frames are complete snapshots, so moving to any index is deterministic: the player never "undoes"
 * anything, it just shows another snapshot. Jumps of more than one step are flagged `instant`, so
 * views draw them without animating a long distance.
 */

/** The playback speeds offered (multipliers of the interval). */
export const SPEEDS: readonly number[] = [0.5, 0.75, 1, 1.5, 2, 3];

/** A step was shown: `direction` is 1 forwards, -1 backwards, 0 for a load or reset. */
export interface FrameEvent<F> {
  type: 'frame';
  index: number;
  frame: F | undefined;
  total: number;
  direction: number;
  instant: boolean;
}

/** Playing or the speed changed. */
export interface StateEvent {
  type: 'state';
  playing: boolean;
  speed: number;
}

export type PlayerEvent<F> = FrameEvent<F> | StateEvent;

export interface Player<F> {
  readonly index: number;
  readonly frames: readonly F[];
  readonly total: number;
  readonly playing: boolean;
  readonly speed: number;
  /** Replaces the frame list (e.g. after the viewer changes the input) and shows frame 0. */
  load(frames: readonly F[]): void;
  play(): void;
  pause(): void;
  toggle(): void;
  next(): void;
  prev(): void;
  /** Jumps to a step; large jumps render instantly instead of animating through a long distance. */
  seek(target: number): void;
  reset(): void;
  end(): void;
  setSpeed(value: number): void;
  /** Subscribes to frame and state events; returns an unsubscribe function. */
  on(listener: (event: PlayerEvent<F>) => void): () => void;
  destroy(): void;
}

/** The player's actions a key or a control button can name. */
export type PlayerAction = 'play' | 'pause' | 'toggle' | 'next' | 'prev' | 'reset' | 'end';

/** `interval`: ms per step at 1× speed. */
export function createPlayer<F = unknown>({ interval = 1600 }: { interval?: number } = {}): Player<F> {
  let frames: readonly F[] = [];
  let index = 0;
  let playing = false;
  let speed = 1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<(event: PlayerEvent<F>) => void>();

  const emit = (event: PlayerEvent<F>): void => listeners.forEach((fn) => fn(event));
  const total = (): number => frames.length;

  function emitFrame(direction: number, instant = false): void {
    emit({ type: 'frame', index, frame: frames[index], total: total(), direction, instant });
  }

  function emitState(): void {
    emit({ type: 'state', playing, speed });
  }

  function schedule(): void {
    clearTimeout(timer);
    if (!playing) return;
    timer = setTimeout(() => {
      if (index >= total() - 1) return pause();
      index++;
      emitFrame(1);
      if (index >= total() - 1) pause();
      else schedule();
    }, interval / speed);
  }

  function seek(target: number, { instant = false } = {}): void {
    if (!total()) return;
    const next = Math.max(0, Math.min(target, total() - 1));
    const direction = Math.sign(next - index);
    index = next;
    emitFrame(direction, instant || direction === 0);
  }

  function play(): void {
    if (playing || total() < 2) return;
    if (index >= total() - 1) seek(0, { instant: true });
    playing = true;
    emitState();
    schedule();
  }

  function pause(): void {
    clearTimeout(timer);
    if (!playing) return;
    playing = false;
    emitState();
  }

  return {
    get index() { return index; },
    get frames() { return frames; },
    get total() { return total(); },
    get playing() { return playing; },
    get speed() { return speed; },
    load(newFrames) {
      pause();
      frames = newFrames;
      index = 0;
      emitFrame(0, true);
    },
    play,
    pause,
    toggle() {
      if (playing) pause();
      else play();
    },
    next() { pause(); seek(index + 1); },
    prev() { pause(); seek(index - 1); },
    seek(target) {
      pause();
      seek(target, { instant: Math.abs(target - index) > 1 });
    },
    reset() { pause(); seek(0, { instant: true }); },
    end() { pause(); seek(total() - 1, { instant: true }); },
    setSpeed(value) {
      speed = value;
      emitState();
      if (playing) schedule();
    },
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      clearTimeout(timer);
      listeners.clear();
    },
  };
}
