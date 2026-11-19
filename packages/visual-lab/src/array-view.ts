/**
 * ArrayView: an array with indexed cells, values, tones, pointers, sliding windows, floating values
 * (lifted above a cell) and arc arrows between cells. HTML cells moved by CSS transitions (keyed by
 * index, or by `id` when items should travel); styles `.av-*` in `css/visual-lab.css`.
 *
 * Options: { cellSize = 56, minCell = 30, gap = 8, lift = false, arrows = false, minCells = 0, pointerRows = 1, showIndices = true, headroom = 26, filled = false }
 *   lift     reserve a row above the cells for `floating` values
 *   arrows   reserve room above the cells for `arrows`
 *   headroom space above the cells for window labels (with `arrows`: for the arrows, at least 46)
 *   filled   fill a toned cell with its colour (for cells whose colour is the point, not their value)
 *
 * State (`ArrayState`):
 *   values   [3, 8, null]              plain values; null draws an empty slot. Items are keyed by index.
 *   items    [{ id, value } | null]     use instead of `values` when elements should *move* (swap, shift)
 *   tones    { 2: "current" }           tone per index (the slot and the value in it)
 *   dim      [lo, hi]                   dims every index outside lo..hi
 *   pointers { i: 0, j: 3 }             see pointers.ts; an index of -1 or n is allowed; `long: true`
 *                                      draws a longer stem, its name one row lower
 *   window   { from, to, label, tone, icon }  or `windows: [...]`; `icon` is SVG markup before the label
 *   floating [{ id, value, at, tone }]  a value hovering above index `at` (needs `lift`)
 *   icons    [svg | null]              a picture per index (SVG markup), drawn above the value
 *   arrows   [{ from, to, label, tone }]
 *   flash    [indices]                  one-shot pulse on these cells every time the frame is shown
 *   indexLabels [..]                    text under each cell in place of its index
 *   filled   true / false              overrides the `filled` option for this frame
 *   hideEmpty true                     empty slots (and their indices) are not drawn
 */
import { h, s, onResize, replayClass, setTone, syncKeyed, withoutTransitions } from './dom.js';
import { normalizePointers, pointerOffset, pointersHeight, POINTER_EDGE, type PointersState } from './pointers.js';
import type { UpdateContext } from './node-link-view.js';

export type Value = string | number | boolean;

export interface ArrayItem {
  id: string | number;
  value: Value;
}

export interface ArrayWindow {
  from: number;
  to: number;
  label?: string;
  tone?: string;
  icon?: string | null;
  key?: string | number;
}

export interface ArrayState {
  values?: readonly (Value | null)[];
  items?: readonly (ArrayItem | null)[];
  tones?: Readonly<Record<number, string | null | undefined>>;
  dim?: readonly [number, number];
  pointers?: PointersState | null;
  window?: ArrayWindow | null;
  windows?: readonly ArrayWindow[];
  floating?: readonly (ArrayItem & { at: number; tone?: string | null })[];
  icons?: readonly (string | null)[];
  arrows?: readonly { from: number; to: number; label?: string; tone?: string }[];
  flash?: readonly number[];
  indexLabels?: readonly (string | number)[];
  filled?: boolean;
  hideEmpty?: boolean;
}

export interface ArrayOptions {
  cellSize?: number;
  minCell?: number;
  gap?: number;
  lift?: boolean;
  arrows?: boolean;
  minCells?: number;
  pointerRows?: number;
  showIndices?: boolean;
  headroom?: number;
  filled?: boolean;
}

interface Layout {
  cell: number;
  gap: number;
  pitch: number;
  top: number;
  cellsY: number;
  pointersY: number;
  pointerRows: number;
  width: number;
}

interface Placed extends ArrayItem {
  at: number;
  tone?: string | null | undefined;
  dim?: boolean;
  floating?: boolean;
}

/** Sets an element's SVG markup, skipping the DOM work when it hasn't changed. */
function setIcon(el: Element & { _svg?: string | null }, svg: string | null = null): void {
  if (el._svg === svg) return;
  el._svg = svg;
  el.innerHTML = svg ?? '';
}

export class ArrayView {
  readonly el: HTMLDivElement;
  private readonly opts: Required<Omit<ArrayOptions, 'filled'>> & { filled?: boolean };
  private readonly slots = h('div', { class: 'av-layer' });
  private readonly windowsLayer = h('div', { class: 'av-layer' });
  private readonly itemsLayer = h('div', { class: 'av-layer' });
  private readonly pointersLayer = h('div', { class: 'av-layer' });
  private readonly arrowsSvg = s('svg', { class: 'av-arrows', 'aria-hidden': 'true' });
  private readonly track: HTMLDivElement;
  private state: ArrayState = {};
  private width = 0;

  constructor(options: ArrayOptions = {}) {
    this.opts = { cellSize: 56, minCell: 30, gap: 8, lift: false, arrows: false, minCells: 0, pointerRows: 1, showIndices: true, headroom: 26, ...options };
    this.track = h('div', { class: 'av-track' }, this.slots, this.windowsLayer, this.arrowsSvg, this.itemsLayer, this.pointersLayer);
    this.el = h('div', { class: `av${this.opts.filled ? ' av--filled' : ''}`, role: 'img', 'aria-label': 'Array' }, this.track);
    onResize(this.el, (width) => {
      this.width = width;
      withoutTransitions(this.el, () => this.render({ duration: 0 }));
    });
  }

  update(state: ArrayState = {}, ctx: UpdateContext = {}): void {
    this.state = state;
    this.render(ctx);
    state.flash?.forEach((i) => {
      const slot = this.slots.querySelector(`[data-key="${i}"]`);
      if (slot) replayClass(slot, 'is-flash');
    });
  }

  /** Geometry for the current width and number of cells. */
  private layout(n: number): Layout {
    const { cellSize, minCell, gap, lift, arrows, pointerRows } = this.opts;
    // Cells may grow a little when the visualization is shown fullscreen.
    const maxCell = this.el.closest('.is-fullscreen') ? Math.round(cellSize * 1.4) : cellSize;
    // Keep a little room at each side for a pointer name wider than its cell.
    const fit = n ? (this.width - 2 * POINTER_EDGE - (n - 1) * gap) / n : cellSize;
    const cell = Math.max(minCell, Math.min(maxCell, Math.floor(fit)));
    const pitch = cell + gap;
    const top = arrows ? Math.max(46, this.opts.headroom) : this.opts.headroom;
    const liftH = lift ? cell + 22 : 0;
    const cellsY = top + liftH;
    const pointersY = cellsY + cell + (this.opts.showIndices ? 26 : 10);
    return { cell, gap, pitch, top, cellsY, pointersY, pointerRows, width: Math.max(0, n * pitch - gap) };
  }

  private render(ctx: UpdateContext = {}): void {
    const st = this.state;
    const items: readonly (ArrayItem | null)[] = st.items ?? (st.values ?? []).map((value, i) => (value === null ? null : { id: `#${i}`, value }));
    const n = Math.max(items.length, this.opts.minCells);
    const g = this.layout(n);
    const exitMs = ctx.duration ?? 400;
    const tones = st.tones ?? {};
    const [lo, hi] = st.dim ?? [-Infinity, Infinity];
    const isDim = (i: number): boolean => i < lo || i > hi;

    this.el.classList.toggle('av--filled', st.filled ?? !!this.opts.filled);
    this.el.style.setProperty('--cell', `${g.cell}px`);
    this.track.style.width = `${g.width}px`;

    // Slots: one per index, carry the index label and the empty/tone state.
    syncKeyed(this.slots, Array.from({ length: n }, (_, i) => i), {
      key: (i) => i,
      exitMs,
      create: () => h('div', { class: 'av-slot' }, this.opts.showIndices ? h('small', { class: 'av-index' }) : null),
      update: (el, i) => {
        if (el.firstChild) el.firstChild.textContent = String(st.indexLabels?.[i] ?? i);
        el.style.translate = `${i * g.pitch}px ${g.cellsY}px`;
        el.classList.toggle('is-empty', !items[i]);
        el.classList.toggle('is-hidden', !items[i] && !!st.hideEmpty);
        el.classList.toggle('is-dim', isDim(i));
        setTone(el, tones[i]);
      },
    });

    // Values: placed items and floating ones share one keyed layer so an id can travel between
    // "lifted" and "in a cell".
    const placed: Placed[] = items.flatMap((item, i) => (item ? [{ ...item, at: i, tone: tones[i], dim: isDim(i) }] : []));
    const floating: Placed[] = (st.floating ?? []).map((f) => ({ ...f, floating: true }));
    syncKeyed(this.itemsLayer, [...placed, ...floating], {
      key: (item) => item.id,
      exitMs,
      create: () => h('div', { class: 'av-item' }, h('i', { class: 'av-icon', 'aria-hidden': 'true' }), h('span')),
      update: (el, item, _, isNew) => {
        const span = el.lastChild as HTMLSpanElement;
        const icon = item.floating ? null : (st.icons?.[item.at] ?? null);
        setIcon(el.firstChild as HTMLElement, icon);
        el.classList.toggle('has-icon', !!icon);
        const text = String(item.value);
        if (!isNew && span.textContent !== text) replayClass(el, 'is-updated');
        span.textContent = text;
        el.style.translate = `${item.at * g.pitch}px ${item.floating ? g.top : g.cellsY}px`;
        el.classList.toggle('is-floating', !!item.floating);
        el.classList.toggle('is-dim', !!item.dim);
        setTone(el, item.tone);
      },
    });

    // Sliding windows.
    const windows = st.windows ?? (st.window ? [st.window] : []);
    syncKeyed(this.windowsLayer, windows, {
      key: (w, i) => w.key ?? i,
      exitMs,
      create: () => h('div', { class: 'av-window' }, h('span', { class: 'av-window-label' }, h('i', { class: 'av-window-icon', 'aria-hidden': 'true' }), h('span'))),
      update: (el, w) => {
        const span = Math.max(0, w.to - w.from + 1);
        el.style.translate = `${w.from * g.pitch - 6}px ${g.cellsY - 7}px`;
        el.style.width = `${Math.max(0, span * g.pitch - g.gap) + 12}px`;
        el.style.height = `${g.cell + 14}px`;
        el.classList.toggle('is-empty', span === 0);
        const label = el.firstChild as HTMLElement;
        const [iconEl, textEl] = [...label.children] as HTMLElement[];
        if (iconEl) {
          setIcon(iconEl, w.icon ?? null);
          iconEl.hidden = !w.icon;
        }
        if (textEl) textEl.textContent = w.label ?? '';
        label.hidden = !w.label && !w.icon;
        setTone(el, w.tone ?? 'discovered');
      },
    });

    // Pointers, stacked when several share an index.
    const pointers = normalizePointers(st.pointers);
    const level: Record<string, number> = {};
    pointers.forEach((p) => {
      p.level = level[p.at] ?? 0;
      level[p.at] = p.level + 1;
    });
    const rows = Math.max(g.pointerRows, ...Object.values(level), pointers.some((p) => p.long) ? 2 : 0);
    syncKeyed(this.pointersLayer, pointers, {
      key: (p) => p.name,
      exitMs,
      create: () => h('div', { class: 'av-pointer' }, h('span')),
      update: (el, p) => {
        const lvl = p.level ?? 0;
        (el.firstChild as HTMLElement).textContent = p.label;
        el.style.setProperty('--ptr', p.color);
        el.style.translate = `calc(${Number(p.at) * g.pitch + g.cell / 2}px - 50%) ${g.pointersY + pointerOffset(lvl)}px`;
        el.classList.toggle('is-stacked', lvl > 0);
        el.classList.toggle('is-long', !!p.long && lvl === 0);
      },
    });

    this.renderArrows(st.arrows ?? [], g);
    this.el.style.height = `${g.pointersY + pointersHeight(rows) + 6}px`;
  }

  private renderArrows(arrows: NonNullable<ArrayState['arrows']>, g: Layout): void {
    const center = (i: number): number => i * g.pitch + g.cell / 2;
    this.arrowsSvg.setAttribute('width', String(Math.max(g.width, 1)));
    this.arrowsSvg.setAttribute('height', String(g.cellsY));
    this.arrowsSvg.replaceChildren(
      ...arrows.map((a) => {
        const x1 = center(a.from);
        const x2 = center(a.to);
        const y = g.cellsY - 6;
        const lift = Math.min(g.cellsY - 14, 18 + Math.abs(a.to - a.from) * 6);
        const cx = (x1 + x2) / 2;
        const cy = y - lift * 2; // quadratic control point; the curve peaks at y - lift
        // Arrowhead along the end tangent (control point → end).
        const ang = Math.atan2(y - cy, x2 - cx);
        const head = (spread: number): string => `${x2 - 9 * Math.cos(ang + spread)},${y - 9 * Math.sin(ang + spread)}`;
        return s(
          'g',
          { class: `av-arrow tone-${a.tone ?? 'current'}` },
          s('path', { d: `M${x1},${y} Q${cx},${cy} ${x2},${y}` }),
          s('polygon', { points: `${x2},${y} ${head(0.45)} ${head(-0.45)}` }),
          a.label ? s('text', { x: cx, y: y - lift - 6 }, a.label) : null,
        );
      }),
    );
  }
}
