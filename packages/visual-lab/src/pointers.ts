/**
 * Pointers (`i`, `left`, `curr`…): their colours, the short and long state forms, and the layout
 * ArrayView shares with any view that stacks pointer names under an arrow. `POINTER_HEAD` /
 * `POINTER_ROW` must match `.av-pointer` in `css/visual-lab.css`.
 */

/** Default colours for common pointer names, so `i` looks the same in every visualization. */
const COLORS: Readonly<Record<string, string>> = {
  i: 'var(--cyan)', j: 'var(--pink)', k: 'var(--violet)',
  left: 'var(--cyan)', low: 'var(--cyan)', lo: 'var(--cyan)', l: 'var(--cyan)',
  right: 'var(--pink)', high: 'var(--pink)', hi: 'var(--pink)', r: 'var(--pink)',
  start: 'var(--cyan)', end: 'var(--pink)', mid: 'var(--amber)',
  slow: 'var(--green)', fast: 'var(--pink)',
  head: 'var(--green)', tail: 'var(--violet)',
  curr: 'var(--amber)', cur: 'var(--amber)', prev: 'var(--violet)', next: 'var(--cyan)',
  top: 'var(--amber)', front: 'var(--green)', rear: 'var(--violet)', root: 'var(--green)',
};

const TONE_COLORS: Readonly<Record<string, string>> = {
  current: 'var(--amber)', active: 'var(--amber)', compare: 'var(--violet)',
  discovered: 'var(--cyan)', new: 'var(--cyan)',
  done: 'var(--green)', found: 'var(--green)', path: 'var(--green)',
  target: 'var(--pink)', error: 'var(--red)', removed: 'var(--red)', muted: 'var(--text-dim)',
};

/** Pointer geometry (px): the arrow (head + stem) above the first name at an index, then one row per name. */
export const POINTER_HEAD = 26;
export const POINTER_ROW = 24;
/** Room views keep at each side so a name wider than its cell is not cut off. */
export const POINTER_EDGE = 12;

/** y offset of a pointer at stack `level` (0 = the one with the arrow). */
export const pointerOffset = (level: number): number => (level ? POINTER_HEAD + level * POINTER_ROW : 0);

/** Height taken by `rows` stacked pointers. */
export const pointersHeight = (rows: number): number => (rows ? POINTER_HEAD + rows * POINTER_ROW : 0);

/** A pointer's colour: its tone's, else its name's, else cyan. */
export function pointerColor(name: string, tone?: string | null): string {
  if (tone) return TONE_COLORS[tone] ?? tone;
  return COLORS[name] ?? 'var(--cyan)';
}

/** A pointer in long form. `at` is an index or a node id; `null` / `undefined` hides it. */
export interface PointerSpec {
  name: string;
  at?: string | number | null;
  tone?: string | null;
  label?: string;
  /** NodeLinkView: above (default) or below the node. */
  side?: 'top' | 'bottom';
  /** ArrayView: a longer stem, its name one row lower. */
  long?: boolean;
}

/** The pointers state: `{ i: 2 }`, `{ i: { at: 2, tone: "compare" } }` or `[{ name, at, … }]`. */
export type PointersState = readonly PointerSpec[] | Readonly<Record<string, string | number | null | undefined | Omit<PointerSpec, 'name'>>>;

/** A normalised pointer, ready to draw. */
export interface Pointer extends PointerSpec {
  at: string | number;
  label: string;
  color: string;
  /** Its place in the stack at the same index (set by the view). */
  level?: number;
}

/** Normalise pointer state; entries with `at == null` are hidden. */
export function normalizePointers(pointers: PointersState | null | undefined): Pointer[] {
  if (!pointers) return [];
  const list: PointerSpec[] = Array.isArray(pointers)
    ? [...(pointers as readonly PointerSpec[])]
    : Object.entries(pointers).map(([name, value]) =>
        value !== null && typeof value === 'object' && !Array.isArray(value) ? { name, ...value } : { name, at: value as string | number | null | undefined },
      );
  return list
    .filter((p): p is PointerSpec & { at: string | number } => p.at !== null && p.at !== undefined)
    .map((p) => ({ ...p, label: p.label ?? p.name, color: pointerColor(p.name, p.tone) }));
}
