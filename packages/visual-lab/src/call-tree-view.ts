/**
 * CallTreeView: a recursion's call tree, growing as the calls happen, drawn by NodeLinkView. Every
 * node has a fixed slot computed from the whole run (leaf order across, depth down), so nodes never
 * move as the tree grows.
 *
 * Options: { colGap = 80, levelGap = 104, boxSize = [70, 34], maxHeight = 520, note = [] }
 *   note   lines of text above the root, e.g. ["(currIndex, remSum)", "returns: …"]: what a call means
 * State (`CallTreeState`):
 *   nodes  [{ id, parent, x, depth, label, sub, tone, edge, edgeTone, icon, badge, subIcon }]   the
 *          calls made so far; `x` is the slot across (leaf order), `edge` labels the branch from the
 *          parent, `icon` / `badge` / `subIcon` are NodeLinkView's
 *   cols   slots across the whole tree, depth   its deepest level: fixed for a run, so it never rescales
 *   links  [{ from, to, tone }]   dashed arrows between calls (a memo hit → the call that solved it)
 */
import { NodeLinkView, type EdgeSpec, type Id, type NodeSpec, type UpdateContext } from './node-link-view.js';

export interface CallNode {
  id: Id;
  parent?: Id | null;
  x: number;
  depth: number;
  label?: string | number;
  sub?: string | number | null;
  tone?: string | null;
  edge?: string | number | null;
  edgeTone?: string | null;
  icon?: NodeSpec['icon'];
  badge?: NodeSpec['badge'];
  subIcon?: NodeSpec['subIcon'];
}

export interface CallTreeState {
  nodes?: readonly CallNode[];
  cols?: number;
  depth?: number;
  links?: readonly { from: Id; to: Id; tone?: string | null }[];
}

export interface CallTreeOptions {
  colGap?: number;
  levelGap?: number;
  boxSize?: readonly [number, number];
  maxHeight?: number;
  note?: readonly string[];
}

export class CallTreeView {
  readonly el: SVGSVGElement;
  private readonly colGap: number;
  private readonly levelGap: number;
  private readonly note: readonly string[];
  private readonly view: NodeLinkView;

  constructor({ colGap = 80, levelGap = 104, boxSize = [70, 34], maxHeight = 520, note = [] }: CallTreeOptions = {}) {
    this.colGap = colGap;
    this.levelGap = levelGap;
    this.note = note;
    this.view = new NodeLinkView({ boxSize, maxHeight, ariaLabel: 'Call tree' });
    this.el = this.view.el;
  }

  update(state: CallTreeState = {}, ctx?: UpdateContext): void {
    const pad = 44;
    const cols = Math.max(1, state.cols ?? 1);
    const depth = state.depth ?? 0;
    const lineH = 22;
    const top = pad + (this.note.length ? this.note.length * lineH + 6 : 0); // the root's centre
    const at = (n: CallNode): { x: number; y: number } => ({ x: pad + n.x * this.colGap, y: top + n.depth * this.levelGap });
    const calls = state.nodes ?? [];
    const nodes: NodeSpec[] = calls.map((n) => ({ id: n.id, label: n.label ?? null, sub: n.sub, tone: n.tone, icon: n.icon, badge: n.badge, subIcon: n.subIcon, shape: 'box' as const, ...at(n) }));
    const ids = new Set(nodes.map((n) => n.id));
    const edges: EdgeSpec[] = calls
      .filter((n): n is CallNode & { parent: Id } => n.parent != null && ids.has(n.parent))
      .map((n) => ({ id: `${n.parent}>${n.id}`, from: n.parent, to: n.id, label: n.edge, tone: n.edgeTone }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const l of state.links ?? []) {
      const [a, b] = [byId.get(l.from), byId.get(l.to)];
      if (!a || !b) continue;
      // Arc clearly to one side, even between neighbours (bend is relative to the distance).
      const bend = Math.max(0.25, 46 / (Math.hypot(b.x - a.x, b.y - a.y) || 1));
      edges.push({ id: `link:${l.from}>${l.to}`, from: l.from, to: l.to, tone: l.tone, directed: true, dashed: true, bend });
    }
    let left = 0;
    let right = Math.max(pad * 2 + (cols - 1) * this.colGap, 240);
    const height = top + pad + depth * this.levelGap + 16;
    // The note sits centred over the root (its slot is fixed for the run); widen the view to fit it.
    const root = calls.find((n) => n.parent == null);
    if (root && this.note.length) {
      const x = at(root).x;
      const half = Math.max(...this.note.map((line) => line.length)) * 4.4 + 12;
      left = Math.min(left, x - half);
      right = Math.max(right, x + half);
      this.note.forEach((line, i) => nodes.push({ id: `note:${i}`, label: line, shape: 'text', w: half * 2, h: lineH, x, y: pad - 14 + i * lineH, tone: i ? 'muted' : null }));
    }
    this.view.update({ viewBox: [left, 0, right - left, height], nodes, edges }, ctx);
  }
}
