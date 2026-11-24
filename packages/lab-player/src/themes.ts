/**
 * Colour themes for the visualizer box. Each one is a `.vz[data-theme="<id>"]` block in
 * `css/themes.css` that sets the colour tokens; the first entry (Midnight) is the default and needs
 * no block. To add a theme, add its block there and an entry here (a test checks they match). A
 * theme colours the box only, never the rest of the page.
 */
import { h } from '@akshayanimateddsa/visual-lab';

export interface Theme {
  id: string;
  label: string;
  group: 'Dark' | 'Neon' | 'Bright';
}

/** The nine themes, in dropdown order; the first is the default. */
export const THEMES: readonly Theme[] = [
  { id: 'midnight', label: 'Midnight', group: 'Dark' },
  { id: 'graphite', label: 'Graphite', group: 'Dark' },
  { id: 'ocean', label: 'Deep ocean', group: 'Dark' },
  { id: 'cyberpunk', label: 'Cyberpunk', group: 'Neon' },
  { id: 'synthwave', label: 'Synthwave', group: 'Neon' },
  { id: 'galaxy', label: 'Galaxy', group: 'Neon' },
  { id: 'spotlight', label: 'Spotlight', group: 'Neon' },
  { id: 'paper', label: 'Paper', group: 'Bright' },
  { id: 'pastel', label: 'Pastel', group: 'Bright' },
];

const STORAGE_KEY = 'vz-theme';
const CHANGE_EVENT = 'vz-theme-change';
const DEFAULT = 'midnight';

function savedTheme(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return THEMES.some((t) => t.id === id) ? (id as string) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function saveTheme(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode or blocked storage: the choice just isn't remembered */
  }
}

/**
 * Theme dropdown for a visualizer's control bar. Picking a theme applies it to every visualizer on
 * the page (`data-theme` on each `target`) and remembers it in this browser.
 */
export function createThemePicker(target: HTMLElement): HTMLSelectElement {
  const groups = [...new Set(THEMES.map((t) => t.group))];
  const select = h(
    'select',
    { class: 'vz-speed vz-theme', 'aria-label': 'Colour theme', title: 'Colour theme' },
    groups.map((group) =>
      h('optgroup', { label: group }, THEMES.filter((t) => t.group === group).map((t) => h('option', { value: t.id }, t.label))),
    ),
  );
  const apply = (id: string): void => {
    select.value = id;
    if (id === DEFAULT) delete target.dataset['theme'];
    else target.dataset['theme'] = id;
  };
  select.addEventListener('change', () => {
    saveTheme(select.value);
    document.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: select.value }));
  });
  document.addEventListener(CHANGE_EVENT, (event) => apply((event as CustomEvent<string>).detail));
  apply(savedTheme());
  return select;
}
