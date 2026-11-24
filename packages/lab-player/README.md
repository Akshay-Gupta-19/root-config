# packages/lab-player → `@akshayanimateddsa/lab-player`

The step player for visual labs: a demo records its algorithm's steps as snapshot frames, and the
player shows them in a lab box with the step note, Java code and variables, playback controls,
keyboard shortcuts, fullscreen and recording-frame modes, nine colour themes and a motion setting.
Plain DOM, no framework. The views it plays are [`@akshayanimateddsa/visual-lab`](../visual-lab)'s,
or a site's own (anything with `el` and `update(state, ctx)`). Moved from the Akshay Animated DSA
Visual Lab so every site's lab shares one copy. **Every export is listed in
[`catalogue.json`](catalogue.json)** with one line.

```js
import { createTrace, createVisualizer } from '@akshayanimateddsa/lab-player';
import { ArrayView } from '@akshayanimateddsa/visual-lab';
// styles: visual-lab's css/tokens.css + css/visual-lab.css, then css/player.css + css/themes.css

const values = [5, 2, 8];
const t = createTrace();
t.step('Start at the first cell', { line: 2, vars: { i: 0 }, arr: { values, pointers: { i: 0 } } });
t.step('Move to the next one', { line: 3, vars: { i: 1 }, arr: { values, pointers: { i: 1 } } });

const viz = createVisualizer(document.querySelector('#demo'), {
  title: 'Linear scan',
  legend: [{ tone: 'current', label: 'Looking at' }],
  panels: [{ key: 'arr', component: new ArrayView() }],
  code: 'for (int i = 0; i < a.length; i++) {\n  look(a[i]);\n}',
});
viz.load(t.frames);
```

## What's in it
| Part | Does |
| --- | --- |
| `createTrace` | records frames: `step(note, { line, vars, tone, op, ...panelStates })` |
| `createPlayer` | play, pause, step, seek, speed over the frames (no DOM) |
| `createVisualizer` | the whole box; `load(frames, { title, code, legend, marks, op, ... })` swaps the run |
| `createControls`, `createCodePanel`, `createVarsPanel`, `createLegend`, `CalloutView` | its parts, for a site that lays out its own box |
| `THEMES`, `createThemePicker` | Midnight, Graphite, Deep ocean, Cyberpunk, Synthwave, Galaxy, Spotlight, Paper, Pastel |
| `setMotionAllowed`, `setMotion`, `currentMotion`, … | Crisp / Smooth / Bouncy; off (Smooth) until the site allows the choice |
| `createLabShell` + `css/shell.css` | the page around the box: top bar, sidebar of groups and numbered modules, page header, cards, buttons, form controls |

Keys: Space plays, ← → step, Home / End, F fullscreen, V recording frame (1080×1920), C code
fullscreen, B code in the recording frame, H code column, I inputs, Q question, Ctrl + ← → scroll
cut-off content, ? lists them all.

## Site settings
- `--lab-accent`, `--lab-accent-2`, `--lab-gradient` colour the page frame (default: the DSA lab's
  cyan and green); the page's own tokens (`--bg`, `--surface`, `--text`, …) do the rest.
- Mark detail text `.vz-detail`: it shows in window mode and hides in fullscreen.
- `--vz-watermark-text` (a CSS string, e.g. `"example.com"`) on `.vz` draws the site's name faintly
  across the animation; unset, there is none.
- `createVisualizer(root, { inputs, question })`: the page's form (default: a `<form>` right before
  `root`) and its question element, which the fullscreen modes move into their own bars.
- `setMotionAllowed(true)` shows the Motion dropdown.

## Commands
`npm run build -w @akshayanimateddsa/lab-player` (after visual-lab: the root `npm run build` does
both) · `npm test -w @akshayanimateddsa/lab-player`
