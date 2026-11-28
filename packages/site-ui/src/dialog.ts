/**
 * A small modal dialog on the native `<dialog>` element (focus trap, Esc to close, backdrop),
 * styled by css/dialog.css with the same `--ui-*` / `--cal-*` tokens. Each action button may be
 * async: while it runs the buttons are disabled, a thrown error is shown inside the dialog and it
 * stays open; returning `false` also keeps it open. The booking calendar uses it for its forms.
 */
import { append, el } from './dom.js';

/** A button at the bottom of a dialog. */
export interface DialogAction {
  label: string;
  /** primary (filled accent), danger (red) or ghost (plain; the default). */
  kind?: 'primary' | 'danger' | 'ghost';
  /** Runs on click; the dialog closes after it unless it returns false or throws. */
  run?: () => unknown;
}

/** What `openDialog` shows. */
export interface DialogOptions {
  title: string;
  body?: Node | string;
  actions?: DialogAction[];
  /** Called once the dialog has closed, however it closed. */
  onClose?: () => void;
}

/** An open dialog: its element, and `close()` to close it from outside. */
export interface Dialog {
  element: HTMLDialogElement;
  close: () => void;
}

/** Opens a modal dialog in `document.body`; it removes itself when closed. */
export function openDialog(options: DialogOptions): Dialog {
  const error = el('p', { class: 'ui-dialog-error', role: 'alert', hidden: true });
  const buttons = (options.actions ?? [{ label: 'Close' }]).map((action) => {
    const button = el('button', { type: 'button', class: `ui-btn ui-btn--${action.kind ?? 'ghost'}` }, action.label);
    button.addEventListener('click', () => void runAction(action));
    return button;
  });
  const titleId = `ui-dialog-${Math.random().toString(36).slice(2)}`;
  // The padding is on the inner box, so a click on the dialog element itself is a backdrop click.
  const dialog = el('dialog', { class: 'ui-dialog', 'aria-labelledby': titleId },
    el('div', { class: 'ui-dialog-box' },
      el('h2', { class: 'ui-dialog-title', id: titleId }, options.title),
      el('div', { class: 'ui-dialog-body' }, options.body ?? null),
      error,
      el('div', { class: 'ui-dialog-actions' }, ...buttons),
    ),
  );

  async function runAction(action: DialogAction): Promise<void> {
    error.hidden = true;
    for (const button of buttons) button.disabled = true;
    try {
      const result = await action.run?.();
      if (result !== false) dialog.close();
    } catch (problem) {
      error.textContent = problem instanceof Error ? problem.message : String(problem);
      error.hidden = false;
    } finally {
      for (const button of buttons) button.disabled = false;
    }
  }

  dialog.addEventListener('close', () => {
    dialog.remove();
    options.onClose?.();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // a click on the backdrop
  });
  append(document.body, dialog);
  dialog.showModal();
  return { element: dialog, close: () => dialog.close() };
}
