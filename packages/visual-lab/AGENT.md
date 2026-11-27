# AGENT.md — packages/visual-lab (`@akshayanimateddsa/visual-lab`)

Read the root [`../../AGENT.md`](../../AGENT.md) first; these rules add to it. What the package is
and how to use it: [`README.md`](README.md).

- **Every export is listed in [`catalogue.json`](catalogue.json)** with one line: look there before
  writing a new view or helper.

## Rules
- A view has `el` and `update(state, ctx)`; `update` draws from the state alone (the same state
  always gives the same picture, whatever came before); `ctx.duration` (ms) only animates the change.
  Each file's header comment is the state's contract: keep it true, and its types match it.
- Generic only: no demo's steps, explanations or copy, no site's routes, auth or prices. Labels in a
  view stay bare (a name, a value); explaining belongs to the page.
- Tones are one vocabulary (`current`, `compare`, `discovered`, `done`, `found`, `target`, `removed`,
  `muted`, `new`, `path`, `unreviewed`, `waiting`, `existing`, `pressure`, `warning`, and the aliases
  `active` = `current`, `error` = `removed`), coloured through `--tone` (`css/tokens.css`); a new tone
  is styled for every view.
- Nothing touches the DOM at import time (the package loads in Node; `test/catalogue.test.js` imports it).
- Colours, fonts and timing are CSS custom properties; a site sets its own or loads `css/tokens.css`.
  `setMotionEase` lets a site choose how tweens ease (its own motion setting).
- `POINTER_HEAD` / `POINTER_ROW` (`src/pointers.ts`) match `.av-pointer` in `css/visual-lab.css` (tested).
- A new export gets a line in `catalogue.json` (the test fails until it has one). Changing a state
  field or an export is a breaking change (minor bump while `0.x`).
- A site without a build step copies `dist/` and `css/` into its static files and imports
  `dist/index.js` from there; a bundled site imports the package. Check a change in a page that
  draws every view before releasing it.
