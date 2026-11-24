/**
 * Mounts a complete step-by-step visualization in `root`: header, a stage of panels (each a view
 * with `el` and `update(state, ctx)`, getting `frame.state[key]`), the operation pop-up, legend,
 * step note, optional code + variables column, and the playback bar with its tools (theme, motion,
 * view toggles, fullscreen modes, shortcuts). The whole player in one call:
 *
 *   const viz = createVisualizer(root, { title, legend, panels: [{ key: 'arr', component: new ArrayView() }], code });
 *   viz.load(trace.frames);
 *
 * Fullscreen shows only the animation: the header, legend and step note are hidden there, so
 * explanations stay out of the panels. Styles: `css/player.css` and `css/themes.css`.
 */
import { h, replayClass, richText } from '@akshayanimateddsa/visual-lab';
import { createPlayer, type Player, type PlayerAction } from './player.js';
import type { Frame } from './trace.js';
import { createControls } from './controls.js';
import { createCodePanel, type CodeMarks } from './code-panel.js';
import { createVarsPanel } from './vars-panel.js';
import { createCodeToggle, createFullscreenToggles, createInputsToggle, createQuestionToggle, type FullscreenMode } from './view-toggles.js';
import { createThemePicker } from './themes.js';
import { createMotionPicker } from './motion-picker.js';
import { currentMotion, onMotionChange } from './motion-choice.js';
import { createShortcutsHelp } from './shortcuts.js';
import { isMac, isScrollKey, scrollCropped } from './scroll-keys.js';
import { createLegend, type LegendItem } from './legend.js';

const BASE_TRANSITION_MS = 650;
const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** What a panel's view gets with each step. */
export interface RenderContext {
  /** ms to animate the change (0 when instant). */
  duration: number;
  /** Draw without transitions (a jump, a load, a measurement). */
  instant: boolean;
  /** 1 forwards, -1 backwards, 0 for a load or jump to the same step. */
  direction: number;
  index: number;
}

/** A view drawn in a panel: any `visual-lab` view, or one of the site's own. */
export interface PanelComponent {
  el: Element;
  update(state: never, ctx: RenderContext): void;
}

export interface PanelSpec {
  /** The key of this panel's state in each frame's `state`. */
  key: string;
  component: PanelComponent;
  title?: string;
  wide?: boolean;
  className?: string;
}

export interface Complexity {
  label: string;
  value: string;
}

export interface VisualizerConfig {
  title?: string;
  subtitle?: string;
  /** The topic shown top left in fullscreen (defaults to the title). */
  topic?: string;
  complexity?: Complexity[];
  legend?: LegendItem[];
  panels?: PanelSpec[];
  /** Java source shown beside the stage (omit to hide). */
  code?: string;
  codeTitle?: string;
  /** Show the variables panel (default true). */
  showVars?: boolean;
  frames?: Frame[];
  /** ms per step at 1× speed. */
  interval?: number;
  /** A denser layout for small showcase widgets. */
  compact?: boolean;
  /**
   * The page's input form: a toolbar button (I) hides and shows it in every mode, and fullscreen
   * moves it inside so a run can be changed there. Defaults to a <form> right before `root`.
   */
  inputs?: HTMLElement | null;
  /**
   * The question (inside `inputs` on the page): in fullscreen it moves to its own bar, with its own
   * button (Q), starting hidden in every mode. Default: none.
   */
  question?: HTMLElement | null;
}

/** What `load` may change besides the frames. */
export interface LoadOptions {
  title?: string;
  subtitle?: string;
  complexity?: Complexity[];
  legend?: LegendItem[];
  /** New titles for panels created with a title, by panel key. */
  panelTitles?: Record<string, string>;
  code?: string;
  codeTitle?: string;
  /** Lines drawn red / green for the whole run. */
  marks?: CodeMarks;
  /** The run's call ("minEatingSpeed([3, 6, 7, 11], 8)"), popped up for every step without its own `op`. */
  op?: string | null;
}

export interface Visualizer {
  el: HTMLDivElement;
  player: Player<Frame>;
  load(frames: Frame[], options?: LoadOptions): void;
}

export function createVisualizer(root: HTMLElement, config: VisualizerConfig): Visualizer {
  const sibling = root.previousElementSibling;
  const {
    title = '',
    subtitle = '',
    topic = '',
    complexity = [],
    legend = [],
    panels = [],
    code = '',
    codeTitle = 'Java',
    showVars = true,
    frames = [],
    interval = 1600,
    compact = false,
    inputs = sibling instanceof HTMLElement && sibling.matches('form') ? sibling : null,
    question = null,
  } = config;

  const player = createPlayer<Frame>({ interval });

  const titleEl = h('h3', { class: 'vz-title' });
  const subtitleEl = h('p', { class: 'vz-subtitle' });
  const complexityEl = h('div', { class: 'vz-complexity' });
  const headerEl = h('header', { class: 'vz-header' }, h('div', { class: 'vz-heading' }, titleEl, subtitleEl), complexityEl);

  // Fullscreen hides the header; this bar keeps the topic (and the run's title) in view.
  const fsTopic = h('span', { class: 'vz-fs-topic' });
  const fsTitle = h('span', { class: 'vz-fs-title' });
  const fsBar = h('div', { class: 'vz-fs-bar' }, fsTopic, fsTitle);

  const stage = h('div', { class: 'vz-stage' });
  /** Panel title headers by panel key, so `load` can retitle a panel. */
  const panelHeads: Record<string, HTMLElement> = {};
  for (const panel of panels) {
    const head = panel.title ? h('header', { class: 'vz-panel-title' }, panel.title) : null;
    if (head) panelHeads[panel.key] = head;
    stage.appendChild(
      h('section', { class: `vz-panel ${panel.wide ? 'is-wide' : ''} ${panel.className ?? ''}`, 'data-panel': panel.key }, head, panel.component.el as HTMLElement),
    );
  }

  const noteText = h('p', { class: 'vz-note-text' });
  const noteStep = h('span', { class: 'vz-note-step' });
  const note = h('div', { class: 'vz-note', 'aria-live': 'polite' }, noteStep, noteText);

  const codePanel = createCodePanel({ title: codeTitle });
  const varsPanel = createVarsPanel();
  const side = h('aside', { class: 'vz-side' }, codePanel.el, showVars ? varsPanel.el : null);

  // Always in the DOM so `load` can swap it; hidden while empty.
  const legendEl = createLegend(legend);
  legendEl.hidden = !legend.length;

  // The operation being run ("add(5)", "sumRange(0, 2)"): pops up above the drawing when it
  // changes and stays while the steps carry the same one. Its row keeps its height for the whole
  // run (hidden only when no step has one) so the drawing never jumps. A label, not a sentence.
  const opText = h('span', { class: 'vz-op-text' });
  const opEl = h('div', { class: 'vz-op', hidden: true, 'aria-live': 'polite' }, opText);
  opText.addEventListener('animationend', () => opText.classList.remove('is-popping'));
  let runOp: string | null = null;
  let shownOp: string | null = null;
  const opOf = (frame: Frame): string | null => (frame.op === undefined ? runOp : frame.op) || null;
  function showOp(frame: Frame, instant: boolean): void {
    const text = opOf(frame);
    opText.classList.toggle('is-empty', !text);
    if (text === shownOp) return;
    shownOp = text;
    opText.textContent = text ?? '';
    if (text && !instant) replayClass(opText, 'is-popping');
  }

  const main = h('div', { class: 'vz-main' }, opEl, stage, legendEl, note);
  const body = h('div', { class: 'vz-body' }, main, side);
  const el = h('div', {
    class: `vz ${compact ? 'vz--compact' : ''}`,
    tabindex: '0',
    'aria-label': 'Algorithm visualization. Space plays, arrow keys step, Control with an arrow scrolls cut-off content sideways, F fullscreen, V recording frame, C code fullscreen, H shows or hides the code, I inputs, Q question in fullscreen, question mark lists every shortcut.',
  });

  // The side column shows when it has content and the viewer has not hidden it (code fullscreen
  // always shows it: it's all that mode is for).
  let codeVisible = true;
  let codeMode = false;
  const hasSideContent = (): boolean => !codePanel.el.hidden || (showVars && !varsPanel.el.hidden);
  const codeToggle = createCodeToggle((visible) => {
    codeVisible = visible;
    updateSide();
    setTimeout(fitToScreen, 80); // the stage width changed
  });
  function updateSide(): void {
    side.hidden = !(codeVisible || codeMode) || !hasSideContent();
    body.classList.toggle('has-side', !side.hidden);
    codeToggle.hidden = codeMode || !hasSideContent();
  }

  // The page's form: a toolbar button (I) hides and shows it in every mode. Fullscreen shows only
  // this element, so the form moves in while it lasts and back to its place afterwards. Each mode
  // starts with it shown, except the recording frame (a video stays clean) and code fullscreen.
  // The question has its own bar and button (Q) in fullscreen, independent of the inputs: it moves
  // out of its place while fullscreen lasts and starts hidden in every mode.
  const fsQuestion = h('div', { class: 'vz-fs-question', hidden: true });
  const questionHome = document.createComment('visualizer question');
  let questionInside = false;
  const questionToggle = createQuestionToggle((visible) => {
    fsQuestion.hidden = !questionInside || !visible;
    setTimeout(fitToScreen, 80); // the stage height changed
  });
  const fsInputs = h('div', { class: 'vz-fs-inputs', hidden: true });
  const inputsHome = document.createComment('visualizer inputs');
  let inputsInside = false;
  let inputsShown = true;
  const inputsToggle = createInputsToggle((visible) => {
    inputsShown = visible;
    showInputs();
    setTimeout(fitToScreen, 80); // the stage height changed
  });
  inputsToggle.hidden = !inputs;
  function showInputs(): void {
    if (!inputs) return;
    fsInputs.hidden = !inputsInside || !inputsShown;
    inputs.hidden = !inputsInside && !inputsShown;
  }
  let inputsMode: FullscreenMode | undefined;
  function placeInputs(mode: FullscreenMode): void {
    if (!inputs) return;
    const inside = mode !== null; // every fullscreen mode
    if (inside !== inputsInside) {
      if (inside) {
        inputs.before(inputsHome);
        fsInputs.append(inputs);
      } else {
        inputsHome.replaceWith(inputs);
      }
      inputsInside = inside;
    }
    if (question && inside !== questionInside) {
      if (inside) {
        question.before(questionHome);
        fsQuestion.append(question);
      } else {
        questionHome.replaceWith(question);
      }
      questionInside = inside;
    }
    const codeOnly = mode === 'code' || mode === 'code-frame';
    questionToggle.hidden = !question || !inside;
    if (mode === inputsMode) return showInputs();
    inputsMode = mode;
    inputsToggle.setVisible(mode !== 'frame' && !codeOnly); // shows them through onChange
    if (question) questionToggle.setVisible(false); // every mode starts without the question
  }

  // The frame groups what fullscreen shows; it only takes a shape in the recording-frame mode.
  const frameEl = h('div', { class: 'vz-frame' });
  const [fullscreenToggle, recordingToggle, codeFullscreenToggle, codeFrameToggle] = createFullscreenToggles(el, (mode) => {
    codeMode = mode === 'code' || mode === 'code-frame';
    updateSide();
    placeInputs(mode);
    setTimeout(fitToScreen, 80); // after views re-measure their width
  });
  codePanel.addTool(codeFullscreenToggle);
  codePanel.addTool(codeFrameToggle);
  questionToggle.hidden = true; // only in fullscreen, and only with a question
  const mac = isMac();
  // "?" lists every key below; keep it in step when a key is added.
  const shortcuts = createShortcutsHelp(el, () => [
    {
      title: 'Playback',
      keys: [
        { keys: ['Space'], label: 'Play / pause' },
        { keys: ['←'], label: 'Previous step' },
        { keys: ['→'], label: 'Next step' },
        { keys: ['Home'], label: 'First step' },
        { keys: ['End'], label: 'Last step' },
      ],
    },
    {
      title: 'View',
      keys: [
        { keys: ['F'], label: 'Fullscreen' },
        { keys: ['V'], label: 'Recording frame' },
        ...(hasSideContent()
          ? [
              { keys: ['C'], label: 'Code fullscreen' },
              { keys: ['B'], label: 'Code in the recording frame' },
              ...(codeToggle.hidden ? [] : [{ keys: ['H'], label: 'Show / hide the code' }]),
            ]
          : []),
        ...(inputs ? [{ keys: ['I'], label: 'Show / hide the inputs' }] : []),
        ...(question ? [{ keys: ['Q'], label: 'Show / hide the question (fullscreen)' }] : []),
        { keys: ['Ctrl', '←'], label: `Scroll left when something is cut off${mac ? ' (or ⌥ Option ←)' : ''}` },
        { keys: ['Ctrl', '→'], label: `Scroll right when something is cut off${mac ? ' (or ⌥ Option →)' : ''}` },
        { keys: ['Esc'], label: 'Leave fullscreen' },
        { keys: ['?'], label: 'Show / hide these shortcuts' },
      ],
    },
  ]);
  const controls = createControls(player as Player<unknown>, [
    createThemePicker(el), createMotionPicker(), codeToggle, inputsToggle, questionToggle, fullscreenToggle, recordingToggle, shortcuts.button,
  ]);
  frameEl.append(fsBar, fsQuestion, fsInputs, body, controls);
  el.append(headerEl, frameEl);
  root.replaceChildren(el);

  function setHeader(opts: LoadOptions): void {
    if (opts.title !== undefined) {
      titleEl.textContent = opts.title;
      fsTopic.textContent = topic || opts.title;
      fsTitle.textContent = topic && opts.title !== topic ? opts.title : '';
      fsBar.hidden = !fsTopic.textContent;
    }
    if (opts.subtitle !== undefined) {
      subtitleEl.textContent = opts.subtitle;
      subtitleEl.hidden = !opts.subtitle;
    }
    if (opts.complexity) {
      complexityEl.replaceChildren(...opts.complexity.map((c) => h('span', { class: 'vz-chip' }, h('small', {}, c.label), c.value)));
    }
    if (opts.legend) {
      legendEl.replaceChildren(...createLegend(opts.legend).children);
      legendEl.hidden = !opts.legend.length;
    }
    for (const [key, text] of Object.entries(opts.panelTitles ?? {})) {
      const head = panelHeads[key];
      if (head) head.textContent = text;
    }
  }

  function setCode(source: string, newTitle?: string): void {
    codePanel.setCode(source, newTitle);
    updateSide();
  }

  let speedNow = 1;
  function applySpeed(speed: number): number {
    speedNow = speed;
    // The motion stretches or shortens the step transition; it never outlasts the step.
    const scale = currentMotion().scale;
    const ms = reducedMotion() ? 0 : Math.round(Math.min((BASE_TRANSITION_MS * scale) / speed, (interval / speed) * 0.8));
    el.style.setProperty('--viz-dur', `${ms}ms`);
    return ms;
  }
  let duration = applySpeed(1);

  /**
   * The motion (`motion-choice.ts`): `data-motion` on the box, its easing as `--ease` (none: the
   * theme's own) and its scale on the step's length. Only the next step's moves change, so nothing
   * is drawn again.
   */
  const linearSupported = typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', 'linear(0, 1)');
  function applyMotion(): void {
    const motion = currentMotion();
    el.dataset['motion'] = motion.id;
    const ease = motion.css && !linearSupported && motion.fallback ? motion.fallback : motion.css;
    if (ease) el.style.setProperty('--ease', ease);
    else el.style.removeProperty('--ease');
    duration = applySpeed(speedNow);
  }
  applyMotion();
  onMotionChange(applyMotion);

  function renderPanels(state: Record<string, unknown> | undefined, ctx: RenderContext): void {
    for (const panel of panels) (panel.component.update as (s: unknown, c: RenderContext) => void)(state?.[panel.key], ctx);
  }

  /** Tallest the body content gets over the whole run (every step is an instant re-render). */
  function tallestStep(): number {
    const all = player.frames;
    const stride = Math.max(1, Math.ceil(all.length / 80));
    let tallest = 0;
    el.classList.add('is-instant');
    const measure = (i: number): void => {
      renderPanels(all[i]?.state, { duration: 0, instant: true, direction: 0, index: i });
      tallest = Math.max(tallest, body.scrollHeight);
    };
    for (let i = 0; i < all.length; i += stride) measure(i);
    measure(all.length - 1);
    renderPanels(all[player.index]?.state, { duration: 0, instant: true, direction: 0, index: player.index });
    void el.offsetWidth;
    requestAnimationFrame(() => el.classList.remove('is-instant'));
    return tallest;
  }

  /**
   * In fullscreen, scale the stage so the tallest step of the run fits the screen. Zooming changes
   * the views' width (and so their layout), so it re-measures a few times.
   */
  let fitTimer: ReturnType<typeof setTimeout> | undefined;
  function fitToScreen(attempt = 0): void {
    clearTimeout(fitTimer);
    if (!el.classList.contains('is-fullscreen') || codeMode || !player.frames.length) {
      main.style.zoom = '';
      return;
    }
    if (attempt === 0) main.style.zoom = '';
    // On narrow screens the code sits below the stage and takes a fixed share of the height.
    const below = !side.hidden && side.offsetLeft === main.offsetLeft ? side.offsetHeight : 0;
    const available = body.clientHeight - below;
    const tallest = tallestStep() - below;
    if (tallest <= available + 1 || attempt >= 4) return;
    const zoom = (parseFloat(main.style.zoom) || 1) * (available / tallest);
    main.style.zoom = String(Math.max(0.5, zoom - 0.005));
    fitTimer = setTimeout(() => fitToScreen(attempt + 1), 80);
  }
  window.addEventListener('resize', () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitToScreen, 120);
  });

  player.on((event) => {
    if (event.type === 'state') {
      duration = applySpeed(event.speed);
      el.classList.toggle('is-playing', event.playing);
      return;
    }
    const { frame, index, total, direction, instant } = event;
    if (!frame) return;
    const ctx: RenderContext = { duration: instant ? 0 : duration, instant, direction, index };

    if (instant) el.classList.add('is-instant');
    renderPanels(frame.state, ctx);
    if (instant) {
      void el.offsetWidth; // commit the un-animated styles before transitions come back
      requestAnimationFrame(() => el.classList.remove('is-instant'));
    }

    showOp(frame, instant);
    noteStep.textContent = `${index + 1}/${total}`;
    noteText.innerHTML = richText(frame.note);
    note.dataset['tone'] = frame.tone ?? 'info'; // hand-made frames may leave it out
    codePanel.highlight(frame.line);
    varsPanel.update(frame.vars, index > 0 ? player.frames[index - 1]?.vars : {});
    updateSide();
  });

  const KEYS: Record<string, PlayerAction> = { ArrowRight: 'next', ArrowLeft: 'prev', ' ': 'toggle', Home: 'reset', End: 'end' };
  el.addEventListener('keydown', (event) => {
    const target = event.target as Element;
    if (target.closest('input, select, textarea')) return;
    // Ctrl + ← → (⌥ on a Mac) scroll what is cut off sideways (long code lines), also from a focused button.
    if (isScrollKey(event)) {
      event.preventDefault();
      scrollCropped(el, event.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (target.closest('button')) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.key === 'h' || event.key === 'H') && !codeToggle.hidden) return codeToggle.click();
    if ((event.key === 'i' || event.key === 'I') && inputs) return inputsToggle.click();
    if ((event.key === 'q' || event.key === 'Q') && !questionToggle.hidden) return questionToggle.click();
    const action = KEYS[event.key];
    if (!action) return;
    event.preventDefault();
    player[action]();
  });

  setHeader({ title, subtitle, complexity });
  setCode(code, codeTitle);

  const api: Visualizer = {
    el,
    player,
    load(newFrames, opts = {}) {
      setHeader(opts);
      runOp = opts.op ?? null;
      shownOp = null;
      opEl.hidden = !newFrames.some((f) => opOf(f));
      if (opts.code !== undefined) setCode(opts.code, opts.codeTitle);
      if (opts.code !== undefined || opts.marks !== undefined) codePanel.mark(opts.marks);
      player.load(newFrames);
      fitTimer = setTimeout(fitToScreen, 80);
    },
  };
  if (frames.length) api.load(frames);
  return api;
}
