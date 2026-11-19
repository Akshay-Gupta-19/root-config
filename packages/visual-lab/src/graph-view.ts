/**
 * GraphView: a graph with fixed vertex positions (or an automatic circular layout), drawn by
 * NodeLinkView.
 *
 * Options: { directed = false, width = 520, height = 320, maxHeight = 380 }
 *
 * State (`GraphState`):
 *   nodes     [{ id, label?, x?, y?, shape? }]   coordinates in a width × height box; shape "text" for a bare "…"
 *   directed  overrides the constructor option
 *   edges     [{ id?, from, to, weight?, bend?, dashed?, directed?, angle? }]
 *             `id` keeps one edge across steps whatever its direction (and tells parallel edges
 *             apart, each with its own `bend`); from === to is a self-loop, drawn at `angle`
 *             degrees round the vertex (default -90, above it)
 *   tones     { id: tone }
 *   edgeTones { [edge id, or edgeKey(a, b) when it has none]: tone }
 *   subs      { id: "d=2" }              small caption under a vertex
 *   pointers  { curr: id }
 */
import { NodeLinkView, undirectedKey, type EdgeSpec, type Id, type NodeSpec, type UpdateContext } from './node-link-view.js';
import type { PointersState } from './pointers.js';

/** Key used in `edgeTones` for an edge between a and b. */
export function edgeKey(a: Id, b: Id, directed = false): string {
  return directed ? `${a}>${b}` : undirectedKey(a, b);
}

export interface GraphNode {
  id: Id;
  label?: string | number;
  x?: number;
  y?: number;
  shape?: NodeSpec['shape'];
}

export interface GraphState {
  nodes?: readonly GraphNode[];
  directed?: boolean;
  edges?: readonly Omit<EdgeSpec, 'loop'>[];
  tones?: Readonly<Record<string, string | null | undefined>>;
  edgeTones?: Readonly<Record<string, string | null | undefined>>;
  subs?: Readonly<Record<string, string | number | null | undefined>>;
  pointers?: PointersState | null;
}

export interface GraphOptions {
  directed?: boolean;
  width?: number;
  height?: number;
  maxHeight?: number;
}

export class GraphView {
  readonly el: SVGSVGElement;
  private readonly directed: boolean;
  private readonly size: readonly [number, number];
  private readonly view: NodeLinkView;

  constructor({ directed = false, width = 520, height = 320, maxHeight = 380 }: GraphOptions = {}) {
    this.directed = directed;
    this.size = [width, height];
    this.view = new NodeLinkView({ maxHeight, ariaLabel: directed ? 'Directed graph' : 'Graph' });
    this.el = this.view.el;
  }

  update(state: GraphState = {}, ctx?: UpdateContext): void {
    const [width, height] = this.size;
    const nodes = state.nodes ?? [];
    const directed = state.directed ?? this.directed;
    const positioned = nodes.map((n, i) => {
      if (n.x != null && n.y != null) return { ...n, x: n.x, y: n.y };
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return { ...n, x: width / 2 + Math.cos(angle) * (width / 2 - 50), y: height / 2 + Math.sin(angle) * (height / 2 - 40) };
    });

    this.view.update(
      {
        viewBox: [0, 0, width, height],
        nodes: positioned.map((n) => ({ id: n.id, label: n.label ?? n.id, x: n.x, y: n.y, shape: n.shape, tone: state.tones?.[n.id], sub: state.subs?.[n.id] })),
        edges: (state.edges ?? []).map((e) => {
          const id = e.id ?? edgeKey(e.from, e.to, e.directed ?? directed);
          return { ...e, directed: e.directed ?? directed, loop: e.from === e.to, id, tone: state.edgeTones?.[id] ?? e.tone };
        }),
        pointers: state.pointers,
      },
      ctx,
    );
  }
}
