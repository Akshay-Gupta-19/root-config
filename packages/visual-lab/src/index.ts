/**
 * @akshayanimateddsa/visual-lab: generic views for step-by-step algorithm animations, drawn from
 * plain state objects (the same state always gives the same picture; a duration animates the
 * change). Each view has `el` (its root element, to put on the page) and `update(state, ctx)`.
 * Styles: `css/tokens.css` (defaults for the colour tokens) and `css/visual-lab.css`.
 * Every export is listed with one line in `catalogue.json` (checked by a test).
 */

/** An array: cells, tones, pointers, sliding windows, floating values, arc arrows. */
export { ArrayView, type ArrayState, type ArrayOptions, type ArrayItem, type ArrayWindow } from './array-view.js';
/** A graph with fixed or circular vertex positions; directed, weighted, curved and self-loop edges. */
export { GraphView, edgeKey, type GraphState, type GraphOptions, type GraphNode } from './graph-view.js';
/** A rooted tree (binary or n-ary), laid out automatically. */
export { TreeView, type TreeState, type TreeOptions, type TreeNode } from './tree-view.js';
/** A recursion's call tree (a recursion tree), growing call by call in fixed slots. */
export { CallTreeView, type CallTreeState, type CallTreeOptions, type CallNode } from './call-tree-view.js';
/** The node–edge engine the graph, tree and call tree draw with; for new node-link views. */
export {
  NodeLinkView, undirectedKey,
  type NodeLinkState, type NodeLinkOptions, type NodeSpec, type EdgeSpec, type NodeIcon, type Id, type UpdateContext,
} from './node-link-view.js';
/** Pointers: colours, normalising the short and long forms, the stacked layout. */
export {
  normalizePointers, pointerColor, pointerOffset, pointersHeight, POINTER_HEAD, POINTER_ROW, POINTER_EDGE,
  type Pointer, type PointerSpec, type PointersState,
} from './pointers.js';
/** Motion curves (Crisp, Smooth, Bouncy) and where tweens read their easing from. */
export { MOTIONS, spring, cssLinear, easeOutQuart, easeOutQuint, setMotionEase, motionEase, type Motion, type Ease } from './motion.js';
/** A numeric tween for SVG geometry, eased with the motion in use. */
export { tween, lerp } from './tween.js';
/** DOM helpers for views: element builders, tones, keyed reconciliation, resize observing. */
export {
  h, s, setAttrs, escapeHtml, richText, setTone, replayClass, syncKeyed, playEnter, withoutTransitions, onResize,
  type Attrs, type AttrValue, type Child, type Marks, type SyncOptions,
} from './dom.js';
