/**
 * @akshayanimateddsa/lab-player: the step player for visual labs. A demo records its algorithm's
 * steps as snapshot frames (`createTrace`) and `createVisualizer` plays them in a lab box: the
 * views of `@akshayanimateddsa/visual-lab` (or a site's own) in panels, the step note, Java code and
 * variables, playback controls, keyboard shortcuts, fullscreen and recording-frame modes, nine
 * colour themes and a motion setting. Styles: `css/player.css` and `css/themes.css`.
 * Every export is listed with one line in `catalogue.json` (checked by a test).
 */

/** Mounts the whole player (header, panels, note, code, variables, controls) in an element. */
export {
  createVisualizer,
  type Visualizer, type VisualizerConfig, type LoadOptions, type PanelSpec, type PanelComponent, type RenderContext, type Complexity,
} from './visualizer.js';
/** Records an algorithm run as snapshot frames. */
export { createTrace, type Trace, type Frame, type StepOptions, type NoteTone } from './trace.js';
/** Playback over a fixed list of frames: play, pause, step, seek, speed. */
export { createPlayer, SPEEDS, type Player, type PlayerEvent, type FrameEvent, type StateEvent, type PlayerAction } from './player.js';
/** The playback bar: buttons, scrubber, step counter, speed, tools. */
export { createControls } from './controls.js';
/** The code panel: Java with the step's lines highlighted, copy button, text size. */
export { createCodePanel, type CodePanel, type CodeMarks } from './code-panel.js';
/** The variables panel, marking what changed since the previous frame. */
export { createVarsPanel, type VarsPanel } from './vars-panel.js';
/** One line of Java as highlighted HTML. */
export { highlightJava } from './java.js';
/** The legend of tones under the drawing. */
export { createLegend, type LegendItem } from './legend.js';
/** A highlighted message block inside the stage. */
export { CalloutView, type CalloutState } from './callout-view.js';
/** The nine colour themes and their dropdown. */
export { THEMES, createThemePicker, type Theme } from './themes.js';
/** The page's motion setting (Crisp, Smooth, Bouncy) and who may change it. */
export { currentMotion, setMotion, motionAllowed, setMotionAllowed, onMotionChange } from './motion-choice.js';
/** The Motion dropdowns: in a control bar, or labelled on a page. */
export { createMotionPicker, mountMotionSetting } from './motion-picker.js';
