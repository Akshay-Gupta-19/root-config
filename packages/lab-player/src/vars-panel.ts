/**
 * The variables panel: the variables in scope for the current step. A variable is marked as changed
 * when it differs from the *previous frame* (not the previously shown one), so the marks are the
 * same whether you arrive by stepping or scrubbing.
 */
import { h, replayClass } from '@akshayanimateddsa/visual-lab';

const format = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return '–';
  if (Array.isArray(value)) return `[${value.map(format).join(', ')}]`;
  return String(value);
};

export interface VarsPanel {
  el: HTMLElement;
  update(vars?: Record<string, unknown>, previous?: Record<string, unknown>): void;
}

export function createVarsPanel({ title = 'Variables' }: { title?: string } = {}): VarsPanel {
  const list = h('dl', { class: 'vz-vars' });
  const el = h('section', { class: 'vz-vars-panel', 'aria-label': title }, h('header', { class: 'vz-side-title' }, title), list);
  const items = new Map<string, HTMLElement>();

  return {
    el,
    update(vars = {}, previous = {}) {
      const keys = Object.keys(vars);
      el.hidden = keys.length === 0;
      for (const [key, item] of items) {
        if (!(key in vars)) {
          item.remove();
          items.delete(key);
        }
      }
      for (const key of keys) {
        let item = items.get(key);
        if (!item) {
          item = h('div', { class: 'vz-var' }, h('dt', {}, key), h('dd'));
          items.set(key, item);
        }
        list.appendChild(item); // keeps the frame's key order
        const text = format(vars[key]);
        (item.querySelector('dd') as HTMLElement).textContent = text;
        const changed = key in previous && format(previous[key]) !== text;
        item.classList.toggle('is-changed', changed);
        if (changed) replayClass(item, 'is-changed');
      }
    },
  };
}
