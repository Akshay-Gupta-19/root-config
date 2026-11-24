/**
 * The visualizer's view buttons: show / hide the code column (H), the page's inputs (I) and the
 * question (Q, fullscreen only), and the fullscreen modes: a regular one (F), a recording frame
 * shaped as a 1080×1920 vertical video (V), code only (C) and code in the recording frame (B).
 */
import { h } from '@akshayanimateddsa/visual-lab';
import { ICONS } from './icons.js';

/** A fullscreen layout, or null when not fullscreen. */
export type FullscreenMode = 'wide' | 'frame' | 'code' | 'code-frame' | null;

/** A tool button that shows or hides something; `setVisible(next)` sets it without a click. */
export interface ShowHideToggle extends HTMLButtonElement {
  setVisible(next: boolean): void;
}

const toolButton = (label: string, icon: string): HTMLButtonElement => {
  const btn = h('button', { class: 'vz-btn vz-tool', type: 'button', 'aria-label': label, title: label, 'aria-pressed': 'false' });
  btn.innerHTML = icon;
  return btn;
};

/** Show / hide button for the code + variables column (H). `onChange(visible)` applies it. */
export function createCodeToggle(onChange: (visible: boolean) => void): HTMLButtonElement {
  let visible = true;
  const btn = toolButton('Hide code (H)', ICONS.code);
  btn.dataset['tool'] = 'code';
  const render = (): void => {
    const label = visible ? 'Hide code (H)' : 'Show code (H)';
    btn.setAttribute('aria-pressed', String(visible));
    btn.setAttribute('aria-label', label);
    btn.title = label;
  };
  btn.addEventListener('click', () => {
    visible = !visible;
    render();
    onChange(visible);
  });
  render();
  return btn;
}

/** Show / hide button for the page's inputs (I), in every mode. */
export const createInputsToggle = (onChange: (visible: boolean) => void): ShowHideToggle =>
  showHideToggle('inputs', 'inputs (I)', ICONS.inputs, onChange);

/** Show / hide button for the question (Q), in the fullscreen modes. */
export const createQuestionToggle = (onChange: (visible: boolean) => void): ShowHideToggle =>
  showHideToggle('question', 'question (Q)', ICONS.question, onChange);

function showHideToggle(tool: string, what: string, icon: string, onChange: (visible: boolean) => void): ShowHideToggle {
  let visible = true;
  const btn = toolButton(`Hide ${what}`, icon) as ShowHideToggle;
  btn.dataset['tool'] = tool;
  const render = (): void => {
    const label = `${visible ? 'Hide' : 'Show'} ${what}`;
    btn.setAttribute('aria-pressed', String(visible));
    btn.setAttribute('aria-label', label);
    btn.title = label;
  };
  btn.addEventListener('click', () => {
    visible = !visible;
    render();
    onChange(visible);
  });
  btn.setVisible = (next) => {
    visible = next;
    render();
    onChange(visible);
  };
  render();
  return btn;
}

/**
 * Fullscreen buttons for a visualizer element. Uses the Fullscreen API and falls back to a fixed
 * full-viewport overlay where the API is missing or refused (e.g. iPhone Safari). The element gets
 * `is-fullscreen`, plus `is-recording` in the recording modes and `is-code-view` in the code modes.
 * Keys: F, V, C, B (not with Ctrl / Alt / Cmd: Ctrl+C copies). `onChange(mode)` runs after every
 * change. Returns [fullscreen, recording frame, code, code in recording frame] buttons; the last two
 * go in the code panel's header.
 */
export function createFullscreenToggles(
  target: HTMLElement,
  onChange: (mode: FullscreenMode) => void = () => undefined,
): [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement, HTMLButtonElement] {
  const wide = toolButton('Fullscreen (F)', ICONS.expand);
  wide.dataset['tool'] = 'fullscreen';
  const framed = toolButton('Recording frame: 1080×1920 reel (V)', ICONS.portrait);
  framed.dataset['tool'] = 'recording';
  const code = h('button', { class: 'vz-code-btn', type: 'button', 'aria-pressed': 'false' });
  code.dataset['tool'] = 'code-fullscreen';
  const codeFramed = h('button', { class: 'vz-code-btn', type: 'button', 'aria-pressed': 'false' });
  codeFramed.dataset['tool'] = 'code-recording';
  let pseudo = false;
  let mode: FullscreenMode = null;

  const isOn = (): boolean => document.fullscreenElement === target || pseudo;
  const label = (btn: HTMLButtonElement, text: string): void => {
    btn.setAttribute('aria-label', text);
    btn.title = text;
  };
  const render = (): void => {
    if (!isOn()) mode = null;
    target.classList.toggle('is-fullscreen', !!mode);
    target.classList.toggle('is-recording', mode === 'frame' || mode === 'code-frame');
    target.classList.toggle('is-code-view', mode === 'code' || mode === 'code-frame');
    target.classList.toggle('is-pseudo-fullscreen', pseudo);
    document.documentElement.classList.toggle('vz-lock-scroll', pseudo);
    wide.innerHTML = mode === 'wide' ? ICONS.collapse : ICONS.expand;
    wide.setAttribute('aria-pressed', String(mode === 'wide'));
    label(wide, mode === 'wide' ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)');
    framed.setAttribute('aria-pressed', String(mode === 'frame'));
    label(framed, mode === 'frame' ? 'Exit recording frame (Esc)' : 'Recording frame: 1080×1920 reel (V)');
    code.innerHTML = mode === 'code' ? ICONS.collapse : ICONS.expand;
    code.setAttribute('aria-pressed', String(mode === 'code'));
    label(code, mode === 'code' ? 'Exit code fullscreen (Esc)' : 'Code fullscreen (C)');
    codeFramed.innerHTML = ICONS.portrait;
    codeFramed.setAttribute('aria-pressed', String(mode === 'code-frame'));
    label(codeFramed, mode === 'code-frame' ? 'Exit code recording frame (Esc)' : 'Code in recording frame: 1080×1920 reel (B)');
    onChange(mode);
  };

  async function exit(): Promise<void> {
    if (document.fullscreenElement === target) await document.exitFullscreen();
    pseudo = false;
    mode = null;
    render();
  }

  async function enter(next: FullscreenMode): Promise<void> {
    mode = next;
    if (isOn()) return render(); // already fullscreen: just switch the layout
    if (typeof target.requestFullscreen === 'function') {
      try {
        await target.requestFullscreen();
        render();
        target.focus();
        return;
      } catch {
        /* refused: use the overlay instead */
      }
    }
    pseudo = true;
    render();
    target.focus();
  }

  const toggle = (next: FullscreenMode): void => void (mode === next ? exit() : enter(next));

  wide.addEventListener('click', () => toggle('wide'));
  framed.addEventListener('click', () => toggle('frame'));
  code.addEventListener('click', () => toggle('code'));
  codeFramed.addEventListener('click', () => toggle('code-frame'));
  document.addEventListener('fullscreenchange', render);
  target.addEventListener('keydown', (event) => {
    if ((event.target as Element).closest('input, select, textarea')) return;
    if (event.key === 'Escape' && pseudo) void exit();
    if (event.ctrlKey || event.metaKey || event.altKey) return; // Ctrl+C copies, it doesn't open code fullscreen
    if (event.key === 'f' || event.key === 'F') toggle('wide');
    if (event.key === 'v' || event.key === 'V') toggle('frame');
    if (event.key === 'c' || event.key === 'C') toggle('code');
    if (event.key === 'b' || event.key === 'B') toggle('code-frame');
  });
  render();
  return [wide, framed, code, codeFramed];
}
