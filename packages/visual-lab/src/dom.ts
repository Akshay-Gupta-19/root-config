/**
 * Small DOM helpers shared by every view: element builders (`h` for HTML, `s` for SVG), tones,
 * one-shot animation classes, keyed reconciliation that lets CSS transitions animate moves, and a
 * width observer. Nothing here touches the DOM at import time, so the package loads in Node too.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** An attribute value: `null` / `undefined` / `false` leave it out, `true` sets it empty. */
export type AttrValue = string | number | boolean | null | undefined;
/** Attributes for `h` / `s`: `style` may be an object (custom properties allowed), `on*` a listener. */
export type Attrs = Record<string, AttrValue | Record<string, string> | EventListener>;
/** A child: an element, text, or nothing (`null`, `undefined`, `false` are skipped); arrays are flattened. */
export type Child = Node | string | null | undefined | false | Child[];

/** Extra state the views keep on their elements between updates. */
export interface Marks {
  _leaveTimer?: ReturnType<typeof setTimeout> | null;
  _leaving?: boolean;
  isNew?: boolean;
}

const children = (list: Child[]): (Node | string)[] =>
  (list.flat(Infinity as 1) as Child[]).filter((c): c is Node | string => c != null && c !== false);

/** Create an HTML element. `attrs.class`, `attrs.style` (object) and `on*` handlers are supported. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyAttrs(el, attrs);
  el.append(...children(kids));
  return el;
}

/** Create an SVG element. */
export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  applyAttrs(el, attrs);
  el.append(...children(kids));
  return el;
}

function applyAttrs(el: HTMLElement | SVGElement, attrs: Attrs): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'style' && typeof value === 'object') {
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, v);
        else (el.style as unknown as Record<string, string>)[prop] = v;
      }
    } else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
}

/** Set several attributes at once. */
export function setAttrs(el: Element, attrs: Record<string, string | number>): void {
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
}

/** Escape text for HTML. */
export function escapeHtml(text: unknown): string {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** Escape text, then allow `code` and **bold**: enough markup for step explanations. */
export function richText(text: string | null | undefined): string {
  return escapeHtml(text ?? '')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

/** Replace every `tone-*` class on an element with the given tone (or none). */
export function setTone(el: Element, tone: string | null | undefined): void {
  for (const cls of [...el.classList]) if (cls.startsWith('tone-')) el.classList.remove(cls);
  if (tone) el.classList.add(`tone-${tone}`);
}

/** Restart a one-shot CSS animation class (e.g. a pulse) on an element. */
export function replayClass(el: Element, cls: string): void {
  el.classList.remove(cls);
  void el.getBoundingClientRect(); // force reflow so the animation restarts
  el.classList.add(cls);
}

export interface SyncOptions<T, E extends HTMLElement | SVGElement> {
  key: (item: T, index: number) => string | number;
  create: (item: T, index: number) => E;
  update: (el: E, item: T, index: number, isNew: boolean) => void;
  /** How long a removed element keeps `is-leaving` before it is deleted (ms). */
  exitMs?: number;
}

/**
 * Keyed reconciliation for absolutely positioned or ordered children.
 *
 * Elements are matched by key between updates so CSS transitions animate movement. Removed
 * elements get `is-leaving` and are deleted after `exitMs`; if their key comes back first (fast
 * stepping), the removal is cancelled.
 */
export function syncKeyed<T, E extends HTMLElement | SVGElement>(container: Element, items: readonly T[], { key, create, update, exitMs = 400 }: SyncOptions<T, E>): void {
  const existing = new Map<string, E & Marks>();
  for (const el of container.children) {
    const k = (el as HTMLElement).dataset.key;
    if (k != null) existing.set(k, el as E & Marks);
  }

  const seen = new Set<string>();
  items.forEach((item, index) => {
    const k = String(key(item, index));
    seen.add(k);
    let el = existing.get(k);
    const isNew = !el;
    if (!el) {
      el = create(item, index) as E & Marks;
      el.dataset.key = k;
      container.appendChild(el);
    } else if (el._leaveTimer) {
      clearTimeout(el._leaveTimer);
      el._leaveTimer = null;
      el.classList.remove('is-leaving');
    }
    update(el, item, index, isNew);
    if (isNew) playEnter(el);
  });

  for (const [k, el] of existing) {
    if (seen.has(k) || el._leaveTimer) continue;
    el.classList.add('is-leaving');
    el._leaveTimer = setTimeout(() => el.remove(), exitMs);
  }
}

/**
 * Animate an element in from its `is-entering` styles. Call after its final position is set, so
 * only the entering properties (opacity, scale…) animate.
 */
export function playEnter(el: Element): void {
  el.classList.add('is-entering');
  void el.getBoundingClientRect(); // commit the entering styles
  el.classList.remove('is-entering');
}

/** Run `fn` with CSS transitions switched off inside `el` (used for re-layouts on resize). */
export function withoutTransitions(el: HTMLElement, fn: () => void): void {
  el.classList.add('no-anim');
  fn();
  void el.offsetWidth; // commit the new layout before transitions come back
  el.classList.remove('no-anim');
}

/** Observe an element's width; calls `fn(width)` now and on every change. Returns a stop function. */
export function onResize(el: Element, fn: (width: number) => void): () => void {
  let last = -1;
  const ro = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const width = Math.round(entry.contentRect.width);
    if (width !== last) {
      last = width;
      fn(width);
    }
  });
  ro.observe(el);
  return () => ro.disconnect();
}
