# packages/visual-lab → `@akshayanimateddsa/visual-lab`

Generic views for step-by-step algorithm animations, drawn from plain state objects: plain DOM and
SVG, no framework, no runtime dependencies. Extracted from the Akshay Animated DSA Visual Lab so every
site's lab shares one copy. **Every export is listed in [`catalogue.json`](catalogue.json)**
with one line.

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

## How the views work
- A view has `el` and `update(state, ctx)`; `update` draws from the state alone, and `ctx.duration`
  (ms) only animates the change. Each file's header comment describes its state.
- Tones (`current`, `compare`, `discovered`, `done`, `found`, `target`, `removed`, `muted`, `new`,
  `path`, `unreviewed`, `waiting`, `existing`, `pressure`, `warning`) are coloured through `--tone` (`css/tokens.css`).
- Colours, fonts and timing are CSS custom properties: set your own or load `css/tokens.css`.
  `setMotionEase` chooses how tweens ease.
- A site without a build step copies `dist/` and `css/` into its static files and imports
  `dist/index.js` from there; a bundled site imports the package.

## Commands
`npm run build -w @akshayanimateddsa/visual-lab` · `npm test -w @akshayanimateddsa/visual-lab`
