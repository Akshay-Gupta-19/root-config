/**
 * The package's own small DOM helper (internal, not exported): builds elements from a tag,
 * properties and children. Text always goes in as text nodes, never as HTML, so event titles,
 * names and notes from a site's data can't inject markup.
 */

type Child = Node | string | number | false | null | undefined;
type Props = Record<string, string | number | boolean | EventListener | undefined | null>;

/**
 * A new element. `class`, `data-*`, `aria-*` and other attributes are set as attributes; `on<event>`
 * keys add listeners; boolean `true` sets an empty attribute and `false` / null / undefined skip it.
 */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  append(node, ...children);
  return node;
}

/** Appends children, skipping empty ones; strings and numbers become text nodes. */
export function append(parent: Node, ...children: Child[]): void {
  for (const child of children) {
    if (child === false || child === null || child === undefined) continue;
    parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}
