/**
 * The page's motion setting: how the views move between steps, Crisp, Smooth or Bouncy (the curves
 * are `@akshayanimateddsa/visual-lab`'s `MOTIONS`). It never changes what a demo records: the same
 * frames, eased differently.
 *
 * One choice per page, remembered in this browser; every visualizer on the page follows it. The
 * choice is off until the site calls `setMotionAllowed(true)` (a site may keep it for some viewers
 * only); while off, the page moves Smooth whatever is saved. `createMotionPicker` shows the dropdown.
 *
 * The visualizer applies it to its box: `data-motion`, the motion's easing as `--ease`, and its
 * scale on `--viz-dur`; the package's `tween` eases SVG geometry with the same curve
 * (`setMotionEase`, set when this module loads: its one side effect, and it touches no DOM).
 */
import { MOTIONS, setMotionEase, type Motion } from '@akshayanimateddsa/visual-lab';

const DEFAULT_MOTION = 'smooth';
const MOTION_KEY = 'vz-motion';
const CHANGE_EVENT = 'vz-motion-change';

let allowed = false;
let motion = DEFAULT_MOTION;

function savedMotion(): string {
  try {
    const id = localStorage.getItem(MOTION_KEY);
    return MOTIONS.some((m) => m.id === id) ? (id as string) : DEFAULT_MOTION;
  } catch {
    return DEFAULT_MOTION;
  }
}

function emit(): void {
  if (typeof document !== 'undefined') document.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Whether the viewer may choose the motion on this page. */
export const motionAllowed = (): boolean => allowed;

/** Turns the choice on (true: the saved motion) or off (Smooth). */
export function setMotionAllowed(next: boolean): void {
  if (allowed === next) return;
  allowed = next;
  if (allowed) motion = savedMotion();
  emit();
}

/** The motion profile in use (one of `MOTIONS`). */
export function currentMotion(): Motion {
  const id = allowed ? motion : DEFAULT_MOTION;
  return MOTIONS.find((m) => m.id === id) ?? (MOTIONS[1] as Motion);
}

/** Chooses a motion for every visualizer on the page and remembers it. */
export function setMotion(id: string): void {
  if (!MOTIONS.some((m) => m.id === id)) return;
  motion = id;
  try {
    localStorage.setItem(MOTION_KEY, id);
  } catch {
    /* private mode or blocked storage: the choice just isn't remembered */
  }
  emit();
}

/** Runs `fn` whenever the motion, or whether it may be chosen, changes. */
export function onMotionChange(fn: () => void): void {
  document.addEventListener(CHANGE_EVENT, () => fn());
}

// The package's tweens ease with this page's motion, read on every tween.
setMotionEase(() => currentMotion().ease);
