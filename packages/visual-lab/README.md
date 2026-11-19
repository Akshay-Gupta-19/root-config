# packages/visual-lab → `@akshayanimateddsa/visual-lab`

> **Don't start here.** Read the root [`AGENT.md`](../../AGENT.md) first and follow its rule tree.
> This file holds only the rules for this folder.

Generic views for step-by-step algorithm animations, drawn from plain state objects: plain DOM and
SVG, no framework, no runtime dependencies. Extracted from the Akshay Animated DSA Visual Lab so every
site's lab shares one copy. **Every export is listed in [`catalogue.json`](catalogue.json)**
with one line; look there first.

| View | Draws |
| --- | --- |
| `ArrayView` | an array: cells, tones, pointers, sliding windows, floating values, arc arrows |
| `GraphView` | a graph: fixed or circular positions; directed, weighted, curved, self-loop edges |
| `TreeView` | a rooted tree (binary or n-ary), laid out automatically |
| `CallTreeView` | a recursion tree, call by call in fixed slots, memo hits as dashed links |
| `NodeLinkView` | the node–edge engine the three above use; for new node-link views |

```js
import { TreeView } from '@akshayanimateddsa/visual-lab';
// and the styles: css/tokens.css (default colours, optional) + css/visual-lab.css

const tree = new TreeView();
document.querySelector('#demo').append(tree.el);
tree.update({ nodes: [{ id: 1, value: 8, left: 2 }, { id: 2, value: 3 }], tones: { 2: 'current' } }, { duration: 600 });
```

## Rules
- A view has `el` and `update(state, ctx)`; `update` draws from the state alone (the same state
  always gives the same picture, whatever came before); `ctx.duration` (ms) only animates the change.
  Each file's header comment is the state's contract: keep it true, and its types match it.
- Generic only: no demo's steps, explanations or copy, no site's routes, auth or prices. Labels in a
  view stay bare (a name, a value); explaining belongs to the page.
- Tones are one vocabulary (`current`, `compare`, `discovered`, `done`, `found`, `target`, `removed`,
  `muted`, `new`, `path`), coloured through `--tone` (`css/tokens.css`); a new tone is styled for every view.
- Nothing touches the DOM at import time (the package loads in Node; `test/catalogue.test.js` imports it).
- Colours, fonts and timing are CSS custom properties; a site sets its own or loads `css/tokens.css`.
  `setMotionEase` lets a site choose how tweens ease (its own motion setting).
- `POINTER_HEAD` / `POINTER_ROW` (`src/pointers.ts`) match `.av-pointer` in `css/visual-lab.css` (tested).
- A new export gets a line in `catalogue.json` (the test fails until it has one). Changing a state
  field or an export is a breaking change (minor bump while `0.x`).
- A site without a build step copies `dist/` and `css/` into its static files and imports
  `dist/index.js` from there; a bundled site imports the package. Check a change in a page that
  draws every view before releasing it.

## Commands
`npm run build -w @akshayanimateddsa/visual-lab` · `npm test -w @akshayanimateddsa/visual-lab`
