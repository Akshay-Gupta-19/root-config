/**
 * The code panel: Java source with the current step's line(s) highlighted, a copy button and a
 * text-size dropdown (the size applies to every code panel on the page and is remembered in this
 * browser). Lines can also be marked red / green for a whole run (a mistakes page's wrong and fixed
 * code). The visualizer adds its code fullscreen buttons to the header with `addTool`.
 */
import { h } from '@akshayanimateddsa/visual-lab';
import { highlightJava } from './java.js';
import { ICONS } from './icons.js';

/** Code text sizes for the dropdown; the first is the default. */
const CODE_SIZES = [
  { id: 'm', label: 'Code: M', size: '0.77rem' },
  { id: 's', label: 'Code: S', size: '0.68rem' },
  { id: 'l', label: 'Code: L', size: '0.88rem' },
  { id: 'xl', label: 'Code: XL', size: '1rem' },
  { id: 'xxl', label: 'Code: XXL', size: '1.15rem' },
] as const;
const DEFAULT_SIZE = 'm';
const SIZE_KEY = 'vz-code-size';
const SIZE_EVENT = 'vz-code-size-change';

function savedSize(): string {
  try {
    const id = localStorage.getItem(SIZE_KEY);
    return CODE_SIZES.some((s) => s.id === id) ? (id as string) : DEFAULT_SIZE;
  } catch {
    return DEFAULT_SIZE;
  }
}

/** The dropdown that sets the code's text size (`--vz-code-size` on `target`). */
function createSizePicker(target: HTMLElement): HTMLSelectElement {
  const select = h(
    'select',
    { class: 'vz-code-size', 'aria-label': 'Code text size', title: 'Code text size' },
    // Listed small to large, whatever the default is.
    [...CODE_SIZES].sort((a, b) => parseFloat(a.size) - parseFloat(b.size)).map((s) => h('option', { value: s.id }, s.label)),
  );
  const apply = (id: string): void => {
    select.value = id;
    target.style.setProperty('--vz-code-size', (CODE_SIZES.find((s) => s.id === id) ?? CODE_SIZES[0]).size);
  };
  select.addEventListener('change', () => {
    try {
      localStorage.setItem(SIZE_KEY, select.value);
    } catch {
      /* storage blocked: the choice just isn't remembered */
    }
    document.dispatchEvent(new CustomEvent(SIZE_EVENT, { detail: select.value }));
  });
  document.addEventListener(SIZE_EVENT, (event) => apply((event as CustomEvent<string>).detail));
  apply(savedSize());
  return select;
}

/** Puts `text` on the clipboard; resolves to whether it worked. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // No Clipboard API (or it was refused): copy through a hidden textarea instead.
    const area = h('textarea', { readonly: '', style: 'position:fixed;opacity:0' });
    area.value = text;
    document.body.append(area);
    area.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      /* not supported either */
    }
    area.remove();
    return copied;
  }
}

/** A button that copies the panel's code; its icon turns into a tick for a moment once copied. */
function createCopyButton(getText: () => string): HTMLButtonElement {
  const label = 'Copy code';
  const btn = h('button', { class: 'vz-code-btn', type: 'button', 'aria-label': label, title: label });
  btn.dataset['tool'] = 'copy-code';
  btn.innerHTML = ICONS.copy;
  let timer: ReturnType<typeof setTimeout> | undefined;
  btn.addEventListener('click', () => {
    void copyText(getText()).then((copied) => {
      clearTimeout(timer);
      btn.innerHTML = copied ? ICONS.check : ICONS.copy;
      btn.classList.toggle('is-done', copied);
      btn.title = copied ? 'Copied' : "Couldn't copy";
      btn.setAttribute('aria-label', btn.title);
      timer = setTimeout(() => {
        btn.innerHTML = ICONS.copy;
        btn.classList.remove('is-done');
        btn.title = label;
        btn.setAttribute('aria-label', label);
      }, 1500);
    });
  });
  return btn;
}

/** Lines to mark for a whole run: `bug` red, `fix` green (1-based). */
export interface CodeMarks {
  bug?: number | number[];
  fix?: number | number[];
}

export interface CodePanel {
  el: HTMLElement;
  /** Adds a button to the header, just before the text-size dropdown. */
  addTool(button: HTMLElement): void;
  /** Shows `source` (hidden while empty); `title` replaces the header's language label. */
  setCode(source: string | null | undefined, title?: string): void;
  mark(marks?: CodeMarks): void;
  /** Highlights the step's line(s) and scrolls the first into view inside the panel. */
  highlight(line: number | number[] | null | undefined): void;
}

export function createCodePanel({ title = 'Java' }: { title?: string } = {}): CodePanel {
  const titleEl = h('span', {}, title);
  const body = h('ol', { class: 'vz-code-lines' });
  let text = '';
  const sizePlace = h('span');
  const tools = h('span', { class: 'vz-code-tools' }, createCopyButton(() => text), sizePlace);
  const header = h('header', { class: 'vz-side-title vz-code-head' }, titleEl, tools);
  const el = h('section', { class: 'vz-code', 'aria-label': 'Code' }, header, body);
  sizePlace.replaceWith(createSizePicker(el));
  let lines: HTMLLIElement[] = [];

  return {
    el,
    addTool(button) {
      tools.lastElementChild?.before(button);
    },
    setCode(source, newTitle) {
      if (newTitle) titleEl.textContent = newTitle;
      text = (source ?? '').replace(/^\n+|\s+$/g, '');
      el.hidden = !text;
      lines = text.split('\n').map((line) => {
        const li = h('li');
        li.innerHTML = highlightJava(line) || ' ';
        return li;
      });
      body.replaceChildren(...lines);
    },
    mark({ bug = [], fix = [] } = {}) {
      const bugs = new Set([bug].flat());
      const fixes = new Set([fix].flat());
      lines.forEach((li, i) => {
        li.classList.toggle('is-bug', bugs.has(i + 1));
        li.classList.toggle('is-fix', fixes.has(i + 1));
      });
    },
    highlight(line) {
      const active = new Set([line ?? []].flat());
      let first: HTMLLIElement | null = null;
      lines.forEach((li, i) => {
        const on = active.has(i + 1);
        li.classList.toggle('is-current', on);
        if (on && !first) first = li;
      });
      if (first) {
        const li: HTMLLIElement = first;
        // Keep the active line visible without scrolling the page itself.
        const top = li.offsetTop - body.clientHeight / 2 + li.offsetHeight / 2;
        body.scrollTo({ top, behavior: 'smooth' });
      }
    },
  };
}
