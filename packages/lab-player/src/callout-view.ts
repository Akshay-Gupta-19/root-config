/**
 * A highlighted message block inside the stage, for results and call-outs: "Answer: [0, 1, 2]",
 * "Cold 120 ms → warm 24 ms". A view like the `visual-lab` ones (`el` + `update(state)`); it flashes
 * when its text changes. Keep it short: explanations belong in the step note.
 *
 * State: { text, tone?, title? }: `text` allows `code` and **bold**; `tone` is a shared tone
 * (default `discovered`). Option `placeholder`: dim text shown while there is no message (the
 * fullscreen modes hide a panel that shows only its placeholder).
 */
import { h, replayClass, richText, setTone } from '@akshayanimateddsa/visual-lab';

export interface CalloutState {
  text?: string | null;
  tone?: string;
  title?: string | null;
}

export class CalloutView {
  readonly el: HTMLDivElement;
  private readonly placeholder: string;
  private readonly titleEl: HTMLElement;
  private readonly textEl: HTMLParagraphElement;

  constructor({ placeholder = '' }: { placeholder?: string } = {}) {
    this.placeholder = placeholder;
    this.titleEl = h('strong', { class: 'co-title' });
    this.textEl = h('p', { class: 'co-text' });
    this.el = h('div', { class: 'co' }, this.titleEl, this.textEl);
  }

  update(state: CalloutState | null | undefined = {}): void {
    const text = state?.text ?? '';
    const empty = !text;
    this.el.hidden = empty && !this.placeholder;
    this.el.classList.toggle('is-placeholder', empty);
    this.titleEl.textContent = state?.title ?? '';
    this.titleEl.hidden = !state?.title;
    const html = richText(empty ? this.placeholder : text);
    if (this.textEl.innerHTML !== html) {
      this.textEl.innerHTML = html;
      if (text) replayClass(this.el, 'is-flash');
    }
    setTone(this.el, state?.tone ?? 'discovered');
  }
}
