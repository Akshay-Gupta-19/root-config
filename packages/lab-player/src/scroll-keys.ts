/**
 * Sideways scrolling from the keyboard: Ctrl+← / Ctrl+→ scroll whatever is cut off inside the
 * visualizer, such as long code lines in code fullscreen or in the recording frame, where a mouse or
 * trackpad would show on the video. Wired in the visualizer and listed in its "?" shortcuts.
 *
 * Not Alt: on Windows and Linux Alt+← / Alt+→ are the browser's Back / Forward. On a Mac, macOS
 * keeps Ctrl+← / Ctrl+→ (switching desktops), so there ⌥ Option+← / → work too (Back is Cmd+←).
 */

/** True on a Mac (or an iPad with a keyboard), where Ctrl+arrows never reach the page. */
export const isMac = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** True when `node` is shown and can scroll sideways because its content is wider than it. */
function isCropped(node: Element): boolean {
  if (!(node instanceof HTMLElement) || node.scrollWidth <= node.clientWidth + 1) return false;
  if (!node.getClientRects().length) return false; // hidden (display: none somewhere above)
  const { overflowX } = getComputedStyle(node);
  return overflowX === 'auto' || overflowX === 'scroll';
}

/**
 * Scrolls every visible, horizontally cropped element in `root` (root included) by a share of its
 * width; `direction` is -1 (left) or 1 (right). Returns how many elements could scroll.
 */
export function scrollCropped(root: HTMLElement, direction: -1 | 1): number {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cropped = [root, ...root.querySelectorAll('*')].filter(isCropped) as HTMLElement[];
  for (const node of cropped) {
    const step = Math.max(60, Math.round(node.clientWidth * 0.4));
    node.scrollBy({ left: direction * step, behavior: reduced ? 'auto' : 'smooth' });
  }
  return cropped.length;
}

/** True for the scroll keys: Ctrl with ← or → (or ⌥ Option on a Mac), no other modifier. */
export const isScrollKey = (event: KeyboardEvent): boolean =>
  (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
  !event.metaKey &&
  !event.shiftKey &&
  ((event.ctrlKey && !event.altKey) || (isMac() && event.altKey && !event.ctrlKey));
