/**
 * The keyboard shortcuts overlay, like YouTube's: "?" (or the toolbar's keyboard button) opens a
 * list of every key the visualizer answers to; Esc, "?" again, the close button or a click outside
 * the card closes it. It is a modal <dialog> inside the visualizer, so it shows in every fullscreen
 * mode too, and while it is open the player's keys do nothing.
 *
 * The list is built each time it opens from `groups()` (the visualizer's), so it only shows keys
 * that work right now (no I without an inputs form). A key added to the visualizer is added there.
 */
import { h } from '@akshayanimateddsa/visual-lab';
import { ICONS } from './icons.js';

export interface ShortcutGroup {
  title: string;
  keys: { keys: string[]; label: string }[];
}

export interface ShortcutsHelp {
  button: HTMLButtonElement;
  dialog: HTMLDialogElement;
  open(): void;
  close(): void;
}

/** `target`: the visualizer element (`.vz`); "?" pressed in it opens the list. */
export function createShortcutsHelp(target: HTMLElement, groups: () => ShortcutGroup[]): ShortcutsHelp {
  const button = h('button', { class: 'vz-btn vz-tool vz-keys-btn', type: 'button', 'data-tool': 'shortcuts', 'aria-label': 'Keyboard shortcuts (?)', title: 'Keyboard shortcuts (?)' });
  button.innerHTML = ICONS.keyboard;

  const list = h('div', { class: 'vz-keys-groups' });
  const titleId = `vz-keys-title-${Math.random().toString(36).slice(2, 8)}`;
  const closeBtn = h('button', { class: 'vz-keys-close', type: 'button', 'aria-label': 'Close' }, '×');
  const dialog = h(
    'dialog',
    { class: 'vz-keys', 'aria-labelledby': titleId },
    h('div', { class: 'vz-keys-card' }, h('header', { class: 'vz-keys-head' }, h('h2', { class: 'vz-keys-title', id: titleId }, 'Keyboard shortcuts'), closeBtn), list),
  );
  target.append(dialog);

  function open(): void {
    if (dialog.open) return;
    list.replaceChildren(
      ...groups()
        .filter((group) => group.keys.length)
        .map((group) =>
          h(
            'section',
            { class: 'vz-keys-group' },
            h('h3', {}, group.title),
            h('dl', {}, group.keys.flatMap((row) => [h('dt', {}, row.keys.map((key) => h('kbd', {}, key))), h('dd', {}, row.label)])),
          ),
        ),
    );
    dialog.showModal();
    closeBtn.focus();
  }
  const close = (): void => {
    if (dialog.open) dialog.close();
  };

  button.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  // A click on the backdrop lands on the <dialog> itself (the card fills the rest).
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
  // Keys pressed while it's open stay here: no stepping or fullscreen behind the list. Esc still
  // closes it (the dialog's own cancel), and stays from leaving the overlay fullscreen.
  dialog.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === '?') {
      event.preventDefault();
      close();
    }
  });
  target.addEventListener('keydown', (event) => {
    if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as Element).closest('input, select, textarea')) return;
    event.preventDefault();
    open();
  });

  return { button, dialog, open, close };
}
