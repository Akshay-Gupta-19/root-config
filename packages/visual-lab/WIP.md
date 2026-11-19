# visual-lab: work in progress (phase 4a, paused 2026-11-19)

Delete this file when the package is finished.

Done (ported to TypeScript from the DSA site's `public/src/animated-dsa/js/`, not built or checked yet):
- `src/dom.ts` (core/dom.js), `src/tween.ts` (core/tween.js), `src/motion.ts` (the curves of
  core/motion.js plus `setMotionEase`; the lab's saved, admin-gated setting stays in the DSA site
  and calls `setMotionEase(() => currentMotion().ease)`), `src/pointers.ts`,
  `src/node-link-view.ts`, `src/graph-view.ts`, `src/tree-view.ts`, `src/call-tree-view.ts`,
  `src/array-view.ts`.

Left in 4a:
1. `src/index.ts` (every export, with a one-line comment each).
2. `css/visual-lab.css`: the DSA lab's `css/array.css` lines 1–229 (`.av-*`) and
   `css/diagrams.css` lines 1–128 (`.nl-*`). `css/tokens.css`: the lab's `css/tokens.css`
   without `.tok-*`, plus `:root` defaults for `--vz-node`, `--vz-node-stroke`, `--vz-node-text`,
   `--vz-edge` and `--vz-drop` (from the lab's `themes.css` `.vz` block).
3. `package.json` (`@akshayanimateddsa/visual-lab`, 0.1.0, files: dist + css), `tsconfig.json`
   (extends `../../tsconfig.base.json`, lib DOM), `README.md` (a leaf: back-to-root line),
   `catalogue.json` and `test/catalogue.test.js` (each export listed, T42; importing it touches no DOM).
4. root-config: npm workspaces (`packages/*`), `AGENT.md` tree, CI and `publish.yml` loop over
   every package, the `README.md` Status section, and the first-publish steps for the new package
   (a short-lived `NPM_TOKEN`, then the trusted publisher).
5. Typecheck, lint and pack, then open a PR.

4b (DSA site, after the package is on npm): a copy script into `public/vendor/visual-lab/`, the
components and `core/dom.js` / `tween.js` re-exporting from there, `motion.js` keeping its setting,
`library.css` importing the vendor CSS (array.css keeps `.hv-*`, diagrams.css keeps `.nb-*`), the
browser tests (lab-components, lab-pointers) green.
