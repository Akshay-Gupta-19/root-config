# AGENT.md — packages/lab-player (`@akshayanimateddsa/lab-player`)

Read the root [`../../AGENT.md`](../../AGENT.md) first; these rules add to it. What the package is
and how to use it: [`README.md`](README.md).

- **Every export is listed in [`catalogue.json`](catalogue.json)** with one line: look there before
  writing a new player part.

## Purpose
The step player every site's visual lab shares: recording a run as frames, playing them, and the
box around the views (controls, code, variables, shortcuts, fullscreen modes, themes, motion); and
the lab page frame around the box (`shell.ts`, `css/shell.css`: top bar, sidebar, page header,
cards, form controls). The views themselves are `@akshayanimateddsa/visual-lab`'s (or a site's own);
this package never draws a data structure.

## Invariants
- Frames are complete snapshots. The player never undoes anything: showing step i is the same
  whether you got there forwards, backwards or by jumping. A panel's state carries over until a
  step passes that key again, and is then replaced, not merged. `step()` deep-copies
  (`structuredClone`), so state holds no functions, DOM nodes or class instances.
- `line` is 1-based in the code shown, and may be a list of lines.
- Fullscreen shows only the animation: the header, legend and step note are hidden there, and so
  is anything marked `.vz-detail` (`css/player.css`). Window mode may explain more; fullscreen keeps
  labels, essentials and pop-ups (the workspace's visual-lab rule).
- Generic only: no site's routes, auth, prices, demo copy or brand. Site-specific behaviour is an
  option the site passes: the inputs form and question (`createVisualizer`), who may change the
  motion (`setMotionAllowed`, off by default), the watermark text (`--vz-watermark-text`), and the
  styling of the site's own form controls inside `.vz-fs-inputs` / `.vz-fs-question`.
- Nothing touches the DOM at import time (`test/catalogue.test.js` imports the package in Node). The
  one side effect at load is `motion-choice.ts` pointing visual-lab's `tween` at the page's motion.
- Themes: `.vz` in `css/themes.css` sets Midnight's whole palette, so the box looks the same on any
  page; every `.vz[data-theme]` block sets the whole palette too (`--cyan` … `--red`, `--indigo`,
  `--orange`), so every visual-lab tone has a colour in every theme. A new palette colour or tone
  colour is set in all nine (`test/themes.test.js`). A theme block holds no rules for one site's views.
- The page frame takes the site's nav as data (`createLabShell`); it knows no curriculum, prices or
  sign-in. Its class names are the DSA lab's (`lib-*`, `side-*`), so that site can switch to it
  unchanged; colours come from the page's tokens and `--lab-accent` / `--lab-accent-2` /
  `--lab-gradient`, never fixed values.
- A key added to the visualizer is added to its "?" list in `src/visualizer.ts`; keys stop while the
  list is open, and letter keys ignore Ctrl / Alt / Cmd (Ctrl+C copies).

## Gotchas
- `player.seek()` renders big jumps instantly (`instant: true`): views must draw an instant update
  without transitions; `prefers-reduced-motion` makes every step instant (0 ms).
- Depends on visual-lab by its published name, so the root `npm run build` builds visual-lab first.
  A site without a build step copies `dist/` (and `css/`) of both packages and rewrites the bare
  `@akshayanimateddsa/visual-lab` import to the copied path when copying.
- Storage keys (`vz-theme`, `vz-motion`, `vz-code-size`) and the events `vz-*-change` are shared by
  every visualizer on a page: one choice applies to all of them.

## Testing
`npm test -w @akshayanimateddsa/lab-player`: the engine (snapshots, carry-over, seeking, playback on
a mock clock), the catalogue, themes against the CSS, the motion setting, the Java highlighter. The
box itself needs a browser: check a change in a site's page that uses every part (a showcase page
and the site's browser tests of the lab) before releasing it.
