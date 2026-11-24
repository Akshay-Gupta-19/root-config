/**
 * The lab page frame: a sticky top bar (menu button, brand, a link back to the main site) and a left
 * sidebar of link groups and numbered, collapsible modules, moved from the DSA Visual Lab. On desktop
 * the sidebar pushes the page and stays open unless the viewer closed it (remembered in this browser);
 * on narrow screens it overlays the page over a backdrop and closes on a link, a tap outside or Esc.
 * Styles: `css/shell.css` (also the page header, sections, cards, lab-home stage cards, buttons and
 * form controls). Nothing here knows a site's curriculum, prices or sign-in: the site passes its nav.
 */
import { h } from '@akshayanimateddsa/visual-lab';

/** A sidebar link. `tag` adds a small label ("Soon", "Full"); a `soon` link is dimmed. */
export interface ShellLink {
  label: string;
  href: string;
  tag?: string;
  soon?: boolean;
}

/** A numbered module that opens to its lessons (open by itself when it holds the current page). */
export interface ShellModule {
  number: number | string;
  title: string;
  links: ShellLink[];
  soon?: boolean;
}

/** A sidebar group under a small heading: plain links, modules, or both. */
export interface ShellGroup {
  title: string;
  note?: string;
  links?: ShellLink[];
  modules?: ShellModule[];
}

export interface ShellOptions {
  /** The element the top bar is drawn in (it gets class `lib-header`); the sidebar goes after it. */
  header: HTMLElement;
  /** The lab's name in the top bar: `title` over a small `subtitle`, linking to the lab home. */
  brand: { title: string; subtitle?: string; href: string; logo?: string };
  /** The top-right link back to the main site. */
  home?: { label: string; href: string; logo?: string };
  groups: ShellGroup[];
  /** Links at the bottom of the sidebar ("← Main website"). */
  footer?: ShellLink[];
  /** The current page's path (default: `location.pathname`); its link is marked `aria-current`. */
  current?: string;
  /** The localStorage key remembering whether the viewer closed the sidebar on desktop. */
  storageKey?: string;
  /** The sidebar's accessible name. */
  label?: string;
}

export interface LabShell {
  sidebar: HTMLElement;
  setOpen(open: boolean): void;
}

const MENU_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

/** The same path with or without a trailing `/` or `index.html`. */
const samePath = (a: string, b: string): boolean => {
  const norm = (p: string): string => p.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
  return norm(a) === norm(b);
};

function linkEl(link: ShellLink, current: string): HTMLLIElement {
  const on = samePath(new URL(link.href, 'https://x.invalid' + current).pathname, current);
  return h('li', {},
    h('a', { class: `side-link${link.soon ? ' side-link--soon' : ''}`, href: link.href, 'aria-current': on ? 'page' : null },
      link.label, link.tag ? h('span', { class: 'side-tag' }, link.tag) : null));
}

/** Builds the top bar and the sidebar, and wires opening and closing. Call once, in the browser. */
export function createLabShell(options: ShellOptions): LabShell {
  const { header, brand, home, groups, footer = [], storageKey = 'lab:sidebar', label = brand.title } = options;
  const current = options.current ?? location.pathname;
  const desktop = matchMedia('(min-width: 1000px)');

  const toggle = h('button', { class: 'nav-toggle', type: 'button', 'aria-label': 'Toggle navigation', 'aria-controls': 'lib-sidebar' });
  toggle.innerHTML = MENU_ICON;
  header.className = 'lib-header';
  header.replaceChildren(
    toggle,
    h('a', { class: 'brand', href: brand.href },
      brand.logo ? h('img', { src: brand.logo, alt: '', width: 34, height: 34 }) : null,
      h('span', {}, brand.title, brand.subtitle ? h('small', {}, brand.subtitle) : null)),
    h('div', { class: 'lib-header-end' },
      home ? h('a', { class: 'lib-home', href: home.href, title: home.label, 'aria-label': home.label },
        home.logo ? h('img', { src: home.logo, alt: '', width: 26, height: 26 }) : null, h('span', {}, home.label)) : null),
  );

  const sidebar = h('nav', { class: 'lib-sidebar', id: 'lib-sidebar', 'aria-label': label },
    groups.map((g) => h('div', { class: 'side-group' },
      h('h4', {}, g.title),
      g.note ? h('p', { class: 'side-note' }, g.note) : null,
      g.links?.length ? h('ul', {}, g.links.map((l) => linkEl(l, current))) : null,
      (g.modules ?? []).map((m) => {
        const items = m.links.map((l) => linkEl(l, current));
        const details = h('details', { class: `side-module${m.soon ? ' side-module--soon' : ''}` },
          h('summary', {}, h('span', { class: 'side-module-num' }, String(m.number).padStart(2, '0')), m.title),
          items.length ? h('ul', {}, items) : null);
        details.open = items.some((li) => li.querySelector('[aria-current]'));
        return details;
      }))),
    footer.length ? h('div', { class: 'side-footer' }, footer.map((l) => h('a', { class: 'side-link', href: l.href }, l.label))) : null,
  );
  const backdrop = h('div', { class: 'sidebar-backdrop', 'aria-hidden': 'true' });
  header.after(sidebar, backdrop);

  const readPref = (): string | null => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  const setOpen = (open: boolean, remember = false): void => {
    document.body.classList.toggle('sidebar-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    sidebar.inert = !open;
    if (remember && desktop.matches) {
      try { localStorage.setItem(storageKey, open ? 'open' : 'closed'); } catch { /* not remembered */ }
    }
  };

  toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('sidebar-open'), true));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a') && !desktop.matches) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !desktop.matches && document.body.classList.contains('sidebar-open')) setOpen(false);
  });
  desktop.addEventListener('change', () => setOpen(desktop.matches && readPref() !== 'closed'));

  // Open by default on desktop (unless the viewer closed it), closed on small screens; no slide-in on load.
  document.body.classList.add('no-transition');
  setOpen(desktop.matches && readPref() !== 'closed');
  requestAnimationFrame(() => document.body.classList.remove('no-transition'));
  sidebar.querySelector('[aria-current]')?.scrollIntoView({ block: 'center' });

  return { sidebar, setOpen };
}
