/**
 * NodeLinkView: the generic SVG node–edge diagram. Linked lists, trees, graphs and call trees are
 * thin layout adapters over it, so they share node styling, tones, edge drawing (directed,
 * weighted, curved, self-loops), pointer labels and animation. Node positions and the viewBox are
 * tweened in JS so edges stay attached to nodes while they move. Styles: `.nl-*` in
 * `css/visual-lab.css`.
 *
 * State (`NodeLinkState`):
 *   viewBox  [x, y, w, h]
 *   nodes    [{ id, x, y, label, tone, shape: "circle"|"box"|"list"|"text", sub, w, h, r, icon, badge, subIcon, ring }]
 *            icon     { kind: "bag"|"jar", fill: 0..1, cross }: a small picture inside a box, left of
 *                     the label, filled from the bottom; `cross` marks it with an ✕
 *            badge    a short value on a gold coin inside the box, right of the label
 *            subIcon  "coin": a small coin left of `sub`
 *            ring     true: a second ring around a circle (a trie node where a word ends)
 *   edges    [{ id?, from, to, directed, weight, label, labelAt, tone, dashed, bend, loop, angle }]
 *            labelAt  where along the edge its label sits, 0 (from) to 1 (to); default 0.5
 *            an edge from a node to itself is drawn only with `loop: true` (at `angle` degrees,
 *            default -90 = above); otherwise it is left out
 *   pointers { curr: nodeId } or [{ name, at: nodeId, tone, label, side: "top"|"bottom" }]
 */
import { s, setAttrs, setTone, playEnter, type Marks } from './dom.js';
import { tween, lerp } from './tween.js';
import { normalizePointers, type Pointer, type PointersState } from './pointers.js';

export type Id = string | number;

export interface NodeIcon {
  kind: 'bag' | 'jar';
  fill?: number;
  cross?: boolean;
}

export interface NodeSpec {
  id: Id;
  x: number;
  y: number;
  label?: string | number | null;
  tone?: string | null | undefined;
  shape?: 'circle' | 'box' | 'list' | 'text' | undefined;
  sub?: string | number | null | undefined;
  w?: number;
  h?: number;
  r?: number;
  icon?: NodeIcon | null | undefined;
  badge?: string | number | null | undefined;
  subIcon?: 'coin' | null | undefined;
  ring?: boolean;
}

export interface EdgeSpec {
  id?: Id | undefined;
  from: Id;
  to: Id;
  directed?: boolean | undefined;
  weight?: string | number | null | undefined;
  label?: string | number | null | undefined;
  labelAt?: number;
  tone?: string | null | undefined;
  dashed?: boolean | undefined;
  bend?: number | undefined;
  loop?: boolean;
  angle?: number | undefined;
}

export interface NodeLinkState {
  viewBox?: readonly number[];
  nodes?: readonly NodeSpec[];
  edges?: readonly EdgeSpec[];
  pointers?: PointersState | null | undefined;
}

/** What every view's `update` takes besides the state: how long the change animates (ms). */
export interface UpdateContext {
  duration?: number;
}

export interface NodeLinkOptions {
  radius?: number;
  boxSize?: readonly [number, number];
  maxHeight?: number;
  ariaLabel?: string;
}

interface Point {
  x: number;
  y: number;
}
type Extent = { r: number; hw?: undefined; hh?: undefined } | { r?: undefined; hw: number; hh: number };
interface DrawnEdge extends EdgeSpec {
  id: string;
  bend: number;
}

type Marked<E extends Element> = E & Marks & { _at?: Point | null; _edge?: DrawnEdge };

/** How far a node's `ring` sits outside its circle. */
const RING_GAP = 5;
let clipSeq = 0;

const q = <E extends Element = SVGElement>(el: Element, selector: string): E => el.querySelector(selector) as E;

export class NodeLinkView {
  readonly el: SVGSVGElement;
  readonly svg: SVGSVGElement;
  private readonly radius: number;
  private readonly boxSize: readonly [number, number];
  private readonly edgesG = s('g', { class: 'nl-edges' });
  private readonly nodesG = s('g', { class: 'nl-nodes' });
  private readonly pointersG = s('g', { class: 'nl-pointers' });
  /** id → position as currently drawn. */
  private readonly pos = new Map<string, Point>();
  private viewBox: number[] | null = null;
  private readonly nodeEls = new Map<string, Marked<SVGGElement>>();
  private readonly edgeEls = new Map<string, Marked<SVGGElement>>();
  private readonly pointerEls = new Map<string, Marked<SVGGElement>>();
  private cancel: () => void = () => undefined;

  constructor({ radius = 22, boxSize = [64, 40], maxHeight = 360, ariaLabel = 'Diagram' }: NodeLinkOptions = {}) {
    this.radius = radius;
    this.boxSize = boxSize;
    this.svg = s('svg', { class: 'nl', role: 'img', 'aria-label': ariaLabel }, this.edgesG, this.nodesG, this.pointersG);
    this.svg.style.maxHeight = `${maxHeight}px`;
    this.el = this.svg;
  }

  update(state: NodeLinkState = {}, ctx: UpdateContext = {}): void {
    const duration = ctx.duration ?? 0;
    const nodes = state.nodes ?? [];
    const edges = (state.edges ?? []).filter((e) => e.from !== e.to || e.loop);
    const pointers = normalizePointers(state.pointers);
    this.cancel();

    // --- nodes -------------------------------------------------------------
    const nodeById = new Map(nodes.map((n) => [String(n.id), n]));
    for (const [id, el] of this.nodeEls) if (!nodeById.has(id)) this.leave(this.nodeEls, id, el, duration);
    nodes.forEach((n) => {
      const id = String(n.id);
      let el = this.nodeEls.get(id);
      if (!el || el._leaving) {
        if (el) el.remove();
        el = this.createNode(n);
        this.nodeEls.set(id, el);
        this.nodesG.appendChild(el);
        this.pos.set(id, { x: n.x, y: n.y });
        el.isNew = true;
      }
      q(el, '.nl-label').textContent = String(n.label ?? n.id);
      q(el, '.nl-sub').textContent = n.sub == null ? '' : String(n.sub);
      this.setIcons(el, n);
      el.classList.toggle('has-ring', !!n.ring);
      setTone(el, n.tone);
    });

    // --- edges -------------------------------------------------------------
    const pairs = new Set(edges.map((e) => `${e.from}>${e.to}`));
    const edgeList: DrawnEdge[] = edges.map((e) => {
      const id = String(e.id ?? (e.directed ? `${e.from}>${e.to}` : undirectedKey(e.from, e.to)));
      // Two opposite directed edges would overlap, so bend both apart.
      const bend = e.bend ?? (e.directed && pairs.has(`${e.to}>${e.from}`) ? 0.18 : 0);
      return { ...e, id, bend };
    });
    const edgeIds = new Set(edgeList.map((e) => e.id));
    for (const [id, el] of this.edgeEls) if (!edgeIds.has(id)) this.leave(this.edgeEls, id, el, duration);
    edgeList.forEach((e) => {
      let el = this.edgeEls.get(e.id);
      if (!el || el._leaving) {
        if (el) el.remove();
        el = this.createEdge();
        this.edgeEls.set(e.id, el);
        this.edgesG.appendChild(el);
        el.isNew = true;
      }
      el._edge = e;
      setTone(el, e.tone);
      el.classList.toggle('is-dashed', !!e.dashed);
      q(el, '.nl-head').style.display = e.directed ? '' : 'none';
      const label = e.label ?? e.weight;
      const labelG = q(el, '.nl-weight');
      labelG.style.display = label == null ? 'none' : '';
      q(labelG, 'text').textContent = label == null ? '' : String(label);
      // Wider labels ("leave", "take") get a wider badge; short weights keep the 26px one.
      const width = Math.max(26, String(label ?? '').length * 8 + 10);
      setAttrs(q(labelG, 'rect'), { x: -width / 2, width });
    });

    // --- pointers ----------------------------------------------------------
    const level: Record<string, number> = {};
    const visiblePointers = pointers.filter((p) => nodeById.has(String(p.at)));
    visiblePointers.forEach((p) => {
      const key = `${p.at}:${p.side ?? 'top'}`;
      p.level = level[key] ?? 0;
      level[key] = p.level + 1;
    });
    const pointerNames = new Set(visiblePointers.map((p) => p.name));
    for (const [name, el] of this.pointerEls) if (!pointerNames.has(name)) this.leave(this.pointerEls, name, el, duration);
    visiblePointers.forEach((p) => {
      let el = this.pointerEls.get(p.name);
      if (!el || el._leaving) {
        if (el) el.remove();
        el = s('g', { class: 'nl-pointer' }, s('text'), s('path'));
        this.pointerEls.set(p.name, el);
        this.pointersG.appendChild(el);
      }
      el.style.setProperty('--ptr', p.color);
      q(el, 'text').textContent = p.label;
    });

    // Paint order follows the state's order, so it is the same however the frame was reached.
    keepOrder(this.nodesG, nodes.map((n) => this.nodeEls.get(String(n.id))));
    keepOrder(this.edgesG, edgeList.map((e) => this.edgeEls.get(e.id)));

    // --- animate geometry ----------------------------------------------------
    const fromPos = new Map(this.pos);
    const fromBox = this.viewBox ?? state.viewBox;
    const toBox = state.viewBox ?? fromBox ?? [0, 0, 400, 240];
    const pointerFrom = new Map([...this.pointerEls].map(([name, el]) => [name, el._at ?? null]));
    this.cancel = tween(duration, (t) => {
      nodes.forEach((n) => {
        const id = String(n.id);
        const a = fromPos.get(id) ?? n;
        this.pos.set(id, { x: lerp(a.x, n.x, t), y: lerp(a.y, n.y, t) });
      });
      // A Bouncy spring passes t = 1; the nodes may overshoot, the zoom shouldn't.
      const box = toBox.map((v, i) => lerp(fromBox?.[i] ?? v, v, Math.min(t, 1)));
      this.viewBox = box;
      this.svg.setAttribute('viewBox', box.join(' '));
      this.draw(nodeById, edgeList, visiblePointers, pointerFrom, t);
    });

    // New nodes and edges fade in once their geometry has been drawn.
    for (const el of [...this.nodeEls.values(), ...this.edgeEls.values()]) {
      if (!el.isNew) continue;
      el.isNew = false;
      playEnter(el);
    }
  }

  private draw(nodeById: Map<string, NodeSpec>, edgeList: readonly DrawnEdge[], pointers: readonly Pointer[], pointerFrom: Map<string, Point | null>, t: number): void {
    for (const [id, el] of this.nodeEls) {
      const p = this.pos.get(id);
      if (el._leaving || !p) continue;
      el.setAttribute('transform', `translate(${p.x} ${p.y})`);
    }

    edgeList.forEach((e) => {
      const el = this.edgeEls.get(e.id);
      const a = this.pos.get(String(e.from));
      const b = this.pos.get(String(e.to));
      if (!el || !a || !b) return;
      const na = nodeById.get(String(e.from));
      const nb = nodeById.get(String(e.to));
      const geo = e.from === e.to ? loopGeometry(a, this.extent(na), e.angle ?? -90) : edgeGeometry(a, b, this.extent(na), this.extent(nb), e.bend, !!e.directed, e.labelAt);
      q(el, '.nl-line').setAttribute('d', geo.d);
      q(el, '.nl-head').setAttribute('points', geo.head);
      q(el, '.nl-weight').setAttribute('transform', `translate(${geo.mid.x} ${geo.mid.y})`);
    });

    // Pointers glide from their previous node to the new one.
    pointers.forEach((p) => {
      const el = this.pointerEls.get(p.name);
      const node = nodeById.get(String(p.at));
      if (!el || !node) return;
      const target = this.pointerAnchor(node, p);
      const from = pointerFrom.get(p.name);
      const pt = from ? { x: lerp(from.x, target.x, t), y: lerp(from.y, target.y, t) } : target;
      el._at = pt;
      const down = (p.side ?? 'top') === 'top';
      setAttrs(q(el, 'text'), { x: pt.x, y: down ? pt.y - 10 : pt.y + 18 });
      q(el, 'path').setAttribute(
        'd',
        down ? `M${pt.x - 5},${pt.y - 6} L${pt.x + 5},${pt.y - 6} L${pt.x},${pt.y}Z` : `M${pt.x - 5},${pt.y + 6} L${pt.x + 5},${pt.y + 6} L${pt.x},${pt.y}Z`,
      );
    });
  }

  /** Half-size of a node's shape, used to clip edges at its border. */
  private extent(node: NodeSpec | undefined): Extent {
    if (!node) return { r: this.radius };
    if (node.shape === 'box' || node.shape === 'list' || node.shape === 'text') {
      const [w, h] = [node.w ?? this.boxSize[0], node.h ?? this.boxSize[1]];
      return { hw: w / 2, hh: h / 2 };
    }
    return { r: (node.r ?? this.radius) + (node.ring ? RING_GAP : 0) };
  }

  private pointerAnchor(node: NodeSpec, p: Pointer): Point {
    const pos = this.pos.get(String(node.id)) ?? node;
    const ext = this.extent(node);
    const half = ext.r ?? ext.hh;
    const step = 18 * (p.level ?? 0);
    return (p.side ?? 'top') === 'top' ? { x: pos.x, y: pos.y - half - 6 - step } : { x: pos.x, y: pos.y + half + 6 + step };
  }

  private createNode(n: NodeSpec): Marked<SVGGElement> {
    const shape = n.shape ?? 'circle';
    let body: SVGGElement;
    if (shape === 'circle') body = s('g', {}, s('circle', { class: 'nl-ring', r: (n.r ?? this.radius) + RING_GAP }), s('circle', { class: 'nl-shape', r: n.r ?? this.radius }));
    else {
      const [w, hgt] = [n.w ?? this.boxSize[0], n.h ?? this.boxSize[1]];
      body = s('g', {}, s('rect', { class: 'nl-shape', x: -w / 2, y: -hgt / 2, width: w, height: hgt, rx: 10 }));
      // A linked-list node shows its `next` field as a separate compartment.
      if (shape === 'list') body.append(s('line', { class: 'nl-divider', x1: w / 2 - 18, y1: -hgt / 2, x2: w / 2 - 18, y2: hgt / 2 }), s('circle', { class: 'nl-dot', cx: w / 2 - 9, cy: 0, r: 3 }));
    }
    const labelX = shape === 'list' ? -9 : 0;
    const subY = shape === 'circle' ? (n.r ?? this.radius) + RING_GAP + 16 : (n.h ?? this.boxSize[1]) / 2 + 16;
    return s('g', { class: `nl-node nl-node--${shape}` }, body, s('text', { class: 'nl-label', x: labelX }), s('text', { class: 'nl-sub', y: subY }));
  }

  /**
   * The node's `icon` (inside the box, left of the label), `badge` (a coin with a value, inside the
   * box on the right) and `subIcon` (left of `sub`); the label is centred in the room left between.
   */
  private setIcons(el: SVGGElement, n: NodeSpec): void {
    const w = n.w ?? this.boxSize[0];
    const label = q(el, '.nl-label');
    let icon = el.querySelector<SVGGElement>('.nl-icon');
    if (icon && icon.dataset.kind !== n.icon?.kind) {
      icon.remove();
      icon = null;
    }
    if (n.icon) {
      const shape = ICONS[n.icon.kind];
      if (!icon) {
        icon = iconEl(shape, `nl-clip-${++clipSeq}`);
        icon.dataset.kind = n.icon.kind;
        el.insertBefore(icon, label);
      }
      icon.setAttribute('transform', `translate(${-w / 2 + 16} 0) scale(1.35)`);
      // The fill rises from the bottom of the body.
      const fill = Math.min(1, Math.max(0, n.icon.fill ?? 0));
      setAttrs(q(icon, '.nl-icon-fill'), { y: shape.bottom - fill * shape.height, height: fill * shape.height });
      icon.classList.toggle('is-full', fill >= 1);
      icon.classList.toggle('is-crossed', !!n.icon.cross);
    }

    let badge = el.querySelector<SVGGElement>('.nl-badge');
    if (n.badge != null) {
      if (!badge) {
        badge = s('g', { class: 'nl-coin nl-badge' }, s('circle', { r: 11 }), s('text'));
        el.insertBefore(badge, label);
      }
      badge.setAttribute('transform', `translate(${w / 2 - 15} 0)`);
      q(badge, 'text').textContent = String(n.badge);
    } else badge?.remove();

    const left = n.icon ? -w / 2 + 27 : -w / 2;
    const right = n.badge != null ? w / 2 - 27 : w / 2;
    label.setAttribute('x', String(n.icon || n.badge != null ? (left + right) / 2 : n.shape === 'list' ? -9 : 0));

    let coin = el.querySelector<SVGGElement>('.nl-coin:not(.nl-badge)');
    if (n.subIcon === 'coin' && n.sub != null && n.sub !== '') {
      if (!coin) {
        coin = s('g', { class: 'nl-coin' }, s('circle', { r: 8 }), s('circle', { class: 'nl-coin-rim', r: 4.5 }));
        el.appendChild(coin);
      }
      // 14px mono digits are ~8.4px wide; the coin sits just left of the centred text.
      const subY = Number(q(el, '.nl-sub').getAttribute('y'));
      coin.setAttribute('transform', `translate(${-(String(n.sub).length * 8.4) / 2 - 11} ${subY - 5})`);
    } else coin?.remove();
  }

  private createEdge(): Marked<SVGGElement> {
    const weight = s('g', { class: 'nl-weight' }, s('rect', { x: -13, y: -10, width: 26, height: 20, rx: 6 }), s('text'));
    return s('g', { class: 'nl-edge' }, s('path', { class: 'nl-line' }), s('polygon', { class: 'nl-head' }), weight);
  }

  private leave(map: Map<string, Marked<SVGGElement>>, key: string, el: Marked<SVGGElement>, duration: number): void {
    el._leaving = true;
    el.classList.add('is-leaving');
    map.delete(key);
    setTimeout(() => el.remove(), duration);
  }
}

interface IconShape {
  body: string;
  extra: string;
  bottom: number;
  height: number;
}

/**
 * Icon shapes, about 16 × 18 before scaling, centred on 0,0: `body` is outlined and clips the fill,
 * which rises from `bottom` by up to `height`; `extra` is outlined only.
 */
const ICONS: Readonly<Record<NodeIcon['kind'], IconShape>> = {
  // A sack tied at the neck (a knapsack's bag).
  bag: {
    body: 'M-2.5,-6 C-7,-4.5 -8,-0.5 -8,3 C-8,7 -5,9 0,9 C5,9 8,7 8,3 C8,-0.5 7,-4.5 2.5,-6 Z',
    extra: 'M-2.5,-6 L-4,-9.5 L4,-9.5 L2.5,-6',
    bottom: 9,
    height: 15,
  },
  // A jar with a lid (an amount still to be made).
  jar: {
    body: 'M-6,-5 L6,-5 Q8,-5 8,-3 L8,7 Q8,9 6,9 L-6,9 Q-8,9 -8,7 L-8,-3 Q-8,-5 -6,-5 Z',
    extra: 'M-5,-9.5 L5,-9.5 L5,-5 L-5,-5 Z',
    bottom: 9,
    height: 14,
  },
};

function iconEl({ body, extra }: IconShape, clipId: string): SVGGElement {
  return s(
    'g',
    { class: 'nl-icon' },
    s('clipPath', { id: clipId }, s('path', { d: body })),
    s('rect', { class: 'nl-icon-fill', x: -8, width: 16, 'clip-path': `url(#${clipId})` }),
    s('path', { class: 'nl-icon-line', d: body }),
    s('path', { class: 'nl-icon-line', d: extra }),
    // Shown only with `cross` (a call that failed).
    s('path', { class: 'nl-icon-cross', d: 'M-5,-1 L5,8 M5,-1 L-5,8' }),
  );
}

/** The id of an undirected edge between a and b, the same either way round. */
export function undirectedKey(a: Id, b: Id): string {
  return String(a) < String(b) ? `${a}-${b}` : `${b}-${a}`;
}

/** Reorder `wanted` children to match the given order, touching the DOM only when it differs. */
function keepOrder(parent: Element, wanted: readonly (Marked<SVGGElement> | undefined)[]): void {
  const current = [...parent.children].filter((el) => !(el as Marked<Element>)._leaving);
  if (current.length === wanted.length && current.every((el, i) => el === wanted[i])) return;
  wanted.forEach((el) => el && parent.appendChild(el));
}

/** Point on a node's border in direction (dx, dy) from its centre. */
function clip(ext: Extent, dx: number, dy: number): Point {
  const len = Math.hypot(dx, dy) || 1;
  if (ext.r != null) return { x: (dx / len) * ext.r, y: (dy / len) * ext.r };
  const scale = Math.min(ext.hw / Math.abs(dx || 1e-9), ext.hh / Math.abs(dy || 1e-9));
  return { x: dx * scale, y: dy * scale };
}

interface Geometry {
  d: string;
  head: string;
  mid: Point;
}

/** A self-loop: a teardrop leaving the node's border and coming back, pointing at `angle` degrees. */
function loopGeometry(a: Point, ext: Extent, angle: number): Geometry {
  const r = ext.r ?? Math.min(ext.hw, ext.hh);
  const at = (deg: number, dist: number): Point => {
    const rad = (deg * Math.PI) / 180;
    return { x: a.x + Math.cos(rad) * dist, y: a.y + Math.sin(rad) * dist };
  };
  const start = at(angle - 28, r);
  const end = at(angle + 28, r + 3);
  const c1 = at(angle - 38, r + 48);
  const c2 = at(angle + 38, r + 48);
  const ang = Math.atan2(end.y - c2.y, end.x - c2.x);
  const pt = (spread: number): string => `${end.x - 11 * Math.cos(ang + spread)},${end.y - 11 * Math.sin(ang + spread)}`;
  return { d: `M${start.x},${start.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`, head: `${end.x},${end.y} ${pt(0.42)} ${pt(-0.42)}`, mid: at(angle, r + 38) };
}

function edgeGeometry(a: Point, b: Point, extA: Extent, extB: Extent, bend: number, directed: boolean, labelAt = 0.5): Geometry {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // Control point offset perpendicular to the edge (0 = straight).
  const c = { x: (a.x + b.x) / 2 - (dy / len) * bend * len, y: (a.y + b.y) / 2 + (dx / len) * bend * len };
  const ca = clip(extA, c.x - a.x, c.y - a.y);
  const cb = clip(extB, c.x - b.x, c.y - b.y);
  const gap = directed ? 3 : 0;
  const start = { x: a.x + ca.x, y: a.y + ca.y };
  const cbLen = Math.hypot(cb.x, cb.y) || 1;
  const end = { x: b.x + cb.x * (1 + gap / cbLen), y: b.y + cb.y * (1 + gap / cbLen) };
  const d = bend ? `M${start.x},${start.y} Q${c.x},${c.y} ${end.x},${end.y}` : `M${start.x},${start.y} L${end.x},${end.y}`;
  const from = bend ? c : start;
  const ang = Math.atan2(end.y - from.y, end.x - from.x);
  const pt = (spread: number): string => `${end.x - 11 * Math.cos(ang + spread)},${end.y - 11 * Math.sin(ang + spread)}`;
  // The point at t = labelAt on the curve (or the line).
  const t = labelAt;
  const mid = bend
    ? { x: (1 - t) ** 2 * start.x + 2 * t * (1 - t) * c.x + t * t * end.x, y: (1 - t) ** 2 * start.y + 2 * t * (1 - t) * c.y + t * t * end.y }
    : { x: start.x + t * (end.x - start.x), y: start.y + t * (end.y - start.y) };
  return { d, head: `${end.x},${end.y} ${pt(0.42)} ${pt(-0.42)}`, mid };
}
