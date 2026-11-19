/**
 * Motion curves: how the views move between steps. Crisp, Smooth or Bouncy (`MOTIONS`) only ease
 * the same frames differently. `tween` eases SVG geometry with the curve `motionEase()` returns;
 * a site chooses it with `setMotionEase` (e.g. from a saved setting). Pure: no DOM, runs in Node.
 */

export type Ease = (t: number) => number;

export const easeOutQuart: Ease = (t) => 1 - Math.pow(1 - t, 4);
/** Close to the lab's CSS `--ease` curve; the default. */
export const easeOutQuint: Ease = (t) => 1 - Math.pow(1 - t, 5);

/**
 * An underdamped spring that settles by t = 1: about 16% past the target at t ≈ 0.3, a small dip
 * back, then still. Damping ratio 0.5, natural frequency 12 (so e^(-6) ≈ 0.25% is left at 1).
 */
export function spring(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const zeta = 0.5;
  const omega = 12;
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  const decay = Math.exp(-zeta * omega * t);
  return 1 - decay * (Math.cos(damped * t) + ((zeta * omega) / damped) * Math.sin(damped * t));
}

/** A CSS `linear()` easing that follows `fn`, sampled at `points` + 1 evenly spaced moments. */
export function cssLinear(fn: Ease, points = 40): string {
  const stops = Array.from({ length: points + 1 }, (_, i) => +fn(i / points).toFixed(4));
  return `linear(${stops.join(', ')})`;
}

export interface Motion {
  readonly id: 'crisp' | 'smooth' | 'bouncy';
  readonly label: string;
  /** Stretches the step transition. */
  readonly scale: number;
  /** Eases SVG geometry (`tween`). */
  readonly ease: Ease;
  /** The CSS easing for HTML transitions; null keeps the page's own. */
  readonly css: string | null;
  /** For browsers without CSS `linear()`. */
  readonly fallback?: string;
}

/** The motion profiles. */
export const MOTIONS: readonly Motion[] = [
  { id: 'crisp', label: 'Crisp', scale: 0.6, ease: easeOutQuart, css: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  { id: 'smooth', label: 'Smooth', scale: 1, ease: easeOutQuint, css: null },
  { id: 'bouncy', label: 'Bouncy', scale: 1.3, ease: spring, css: cssLinear(spring), fallback: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
];

let easeSource: () => Ease = () => easeOutQuint;

/** Where `tween` reads its easing from, asked on every tween (so a changed setting applies at once). */
export function setMotionEase(source: () => Ease): void {
  easeSource = source;
}

/** The easing in use now. */
export const motionEase = (): Ease => easeSource();
