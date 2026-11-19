/**
 * TreeView: a rooted tree, laid out automatically and drawn by NodeLinkView. Binary trees keep
 * left / right children on their own side even when a sibling is missing, so the shape stays truthful.
 *
 * State (`TreeState`):
 *   nodes     [{ id, value, left?, right? }]   binary tree (children by id, null for none)
 *             [{ id, value, children: [] }]    or an n-ary tree
 *   root      id (defaults to the first node)
 *   tones     { id: tone }
 *   edgeTones { "parent>child": tone }
 *   pointers  { curr: id }
 *   subs      { id: "text" }                   small caption under a node (depth, height, …)
 *   rings     { id: true }                     a second ring around a node (a trie's word ending)
 *   cols, depth  optional: the whole run's leaf columns and deepest level, so the drawing keeps
 *             one size as the tree grows (the tree is centred in it) instead of rescaling
 *
 * Options: { levelGap = 78, nodeGap = 58, maxHeight = 380, radius = 22 }
 */
import { NodeLinkView, type EdgeSpec, type Id, type NodeSpec, type UpdateContext } from './node-link-view.js';
import type { PointersState } from './pointers.js';

export interface TreeNode {
  id: Id;
  value?: string | number;
  left?: Id | null;
  right?: Id | null;
  children?: readonly Id[];
}

export interface TreeState {
  nodes?: readonly TreeNode[];
  root?: Id;
  tones?: Readonly<Record<string, string | null | undefined>>;
  edgeTones?: Readonly<Record<string, string | null | undefined>>;
  pointers?: PointersState | null;
  subs?: Readonly<Record<string, string | number | null | undefined>>;
  rings?: Readonly<Record<string, boolean | undefined>>;
  cols?: number;
  depth?: number;
}

export interface TreeOptions {
  levelGap?: number;
  nodeGap?: number;
  maxHeight?: number;
  radius?: number;
}

export class TreeView {
  readonly el: SVGSVGElement;
  private readonly levelGap: number;
  private readonly nodeGap: number;
  private readonly view: NodeLinkView;

  constructor({ levelGap = 78, nodeGap = 58, maxHeight = 380, radius = 22 }: TreeOptions = {}) {
    this.levelGap = levelGap;
    this.nodeGap = nodeGap;
    this.view = new NodeLinkView({ radius, maxHeight, ariaLabel: 'Tree' });
    this.el = this.view.el;
  }

  update(state: TreeState = {}, ctx?: UpdateContext): void {
    const nodes = state.nodes ?? [];
    const byId = new Map(nodes.map((n) => [String(n.id), n]));
    const rootId = state.root ?? nodes[0]?.id;
    const binary = nodes.some((n) => 'left' in n || 'right' in n);
    const childrenOf = (n: TreeNode): readonly (Id | null)[] => (binary ? [n.left ?? null, n.right ?? null] : (n.children ?? []));

    // x by in-order position (binary) or by leaf order (n-ary); y by depth.
    const placed = new Map<string, { x: number; depth: number }>();
    let cursor = 0;
    let maxDepth = 0;
    const visit = (id: Id, depth: number): number | null => {
      const n = byId.get(String(id));
      if (!n || placed.has(String(id))) return null;
      maxDepth = Math.max(maxDepth, depth);
      let x: number;
      if (binary) {
        if (n.left != null) visit(n.left, depth + 1);
        x = cursor++;
        if (n.right != null) visit(n.right, depth + 1);
      } else {
        const xs = childrenOf(n).flatMap((k) => (k == null ? [] : [visit(k, depth + 1)])).filter((v): v is number => v != null);
        const first = xs[0];
        const last = xs[xs.length - 1];
        x = first != null && last != null ? (first + last) / 2 : cursor++;
      }
      placed.set(String(id), { x, depth });
      return x;
    };
    if (rootId != null) visit(rootId, 0);

    const pad = 40;
    const cols = Math.max(cursor, state.cols ?? 0);
    const shift = binary ? 0 : ((cols - cursor) / 2) * this.nodeGap;
    maxDepth = Math.max(maxDepth, state.depth ?? 0);
    const viewNodes: NodeSpec[] = [];
    const edges: EdgeSpec[] = [];
    for (const [id, p] of placed) {
      const n = byId.get(id);
      if (!n) continue;
      viewNodes.push({
        id: n.id,
        label: n.value ?? null,
        x: pad + shift + p.x * this.nodeGap,
        y: pad + 14 + p.depth * this.levelGap,
        tone: state.tones?.[n.id],
        sub: state.subs?.[n.id],
        ring: !!state.rings?.[n.id],
      });
      childrenOf(n).forEach((child) => {
        if (child != null && placed.has(String(child))) edges.push({ from: n.id, to: child, id: `${n.id}>${child}`, tone: state.edgeTones?.[`${n.id}>${child}`] });
      });
    }

    const width = pad * 2 + Math.max(0, cols - 1) * this.nodeGap;
    const height = pad * 2 + 28 + maxDepth * this.levelGap;
    this.view.update({ viewBox: [0, 0, Math.max(width, 200), height], nodes: viewNodes, edges, pointers: state.pointers }, ctx);
  }
}
