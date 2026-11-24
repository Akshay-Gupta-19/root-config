/**
 * The legend under the drawing: one swatch per tone with its meaning ("Processing", "Visited").
 * The visualizer draws it from its `legend` option; a page may also place one itself.
 */
import { h } from '@akshayanimateddsa/visual-lab';

/** A legend entry: a tone of the shared vocabulary, its label, and a swatch shape (`round` for nodes). */
export interface LegendItem {
  tone: string;
  label: string;
  shape?: 'round' | '';
}

/** `ul.vz-legend` with one `li.tone-<tone>` per item. */
export function createLegend(items: readonly LegendItem[]): HTMLUListElement {
  return h('ul', { class: 'vz-legend' }, items.map((item) => h('li', { class: `tone-${item.tone}` }, h('i', { class: `vz-swatch ${item.shape ?? ''}` }), item.label)));
}
