/**
 * A minimal numeric tween for SVG geometry (line ends, node positions, viewBox) that CSS
 * transitions can't animate reliably. It eases with the motion in use (`motion.ts`); a Bouncy
 * spring passes 1 before it settles, so `onFrame` may get t a little above 1: clamp what must not
 * overshoot (NodeLinkView's zoom). Returns a cancel function.
 */
import { motionEase } from './motion.js';

export function tween(duration: number, onFrame: (t: number) => void): () => void {
  const ease = motionEase();
  let raf = 0;
  let done = false;
  if (duration <= 0) {
    onFrame(1);
    return () => undefined;
  }
  const finish = (): void => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    clearTimeout(fallback);
    onFrame(1);
  };
  onFrame(0); // draw the starting geometry now, even if the next animation frame is delayed
  const start = performance.now();
  const tick = (now: number): void => {
    if (done) return;
    const t = Math.min(1, (now - start) / duration);
    if (t >= 1) {
      finish();
      return;
    }
    onFrame(ease(t));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  // Background tabs pause animation frames; still land on the final geometry.
  const fallback = setTimeout(finish, duration + 60);
  return () => {
    done = true;
    cancelAnimationFrame(raf);
    clearTimeout(fallback);
  };
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
