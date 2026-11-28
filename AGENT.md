# AGENT.md — root-config

## Start here: rule tree
This file holds only technical rules: the shared code and tooling this repo publishes. Every task
starts here, then goes down the tree to the folder being changed, reading every `AGENT.md` on the
way (lower levels add to their parents and win where they conflict). Each `AGENT.md` has a
`CLAUDE.md` beside it that loads it; `README.md` files describe a folder for people and hold no
rules.
```
AGENT.md                            ← you are here: repo-wide technical rules, and the root-config package's
├── packages/visual-lab/AGENT.md    @akshayanimateddsa/visual-lab: generic algorithm-animation views
├── packages/lab-player/AGENT.md    @akshayanimateddsa/lab-player: the labs' step player (frames, controls, code, themes)
├── packages/docs-check/AGENT.md    @akshayanimateddsa/docs-check: checks a repo's agent docs stay true to it
├── packages/site-ui/AGENT.md       @akshayanimateddsa/site-ui: generic site components (calendar, booking, dialog)
├── scripts/validate.mjs            config sanity check (`npm run build`)
├── .github/workflows/ci.yml        lint + build + test + pack check on every push to main and every PR
└── .github/workflows/publish.yml   publishes every package whose version npm doesn't have yet
```
A new package or folder with rules gets its `AGENT.md` + `CLAUDE.md` pair and a line in this tree
in the same change.

## Repository scope & purpose
- **Type:** Public collection of shared npm packages (open source, MIT), published under the
  `@akshayanimateddsa` scope. Not deployed and not an application.
- **Packages** (npm workspaces): `@akshayanimateddsa/root-config` at the repo root (generic TypeScript,
  ESLint, Prettier and EditorConfig settings) and `packages/*`: today `@akshayanimateddsa/visual-lab`
  (the websites' visual-lab views: array, graph, tree, recursion tree),
  `@akshayanimateddsa/lab-player` (the labs' step player: frames, controls, code and variables
  panels, shortcuts, fullscreen modes, nine themes, motion; built on visual-lab),
  `@akshayanimateddsa/docs-check` (a command that checks a repo's agent docs: rule-file pairs, rule
  tree, paths, ADRs, roadmap lists, README status) and `@akshayanimateddsa/site-ui` (generic site
  components: an Outlook-style calendar, the booking calendar, a dialog, and the pure date and slot
  maths behind them). Only generic pieces live here:
  a demo's steps, explanations and page stay in the website that sells or shows it. Reels and other media never depend on
  website packages; the only code both sides may share is pure, headless helpers (no DOM, markup or
  framework).
- **Few, broad packages.** New shared code joins the package that fits its kind: the root (tooling
  settings only), `visual-lab` (lab views), `lab-player` (lab player and page frame), `docs-check`
  (doc checks), `site-ui` (every other generic site component, as a folder inside it). A new
  package only when none fits, with the owner's approval; its PR says which kinds it will hold.

## Releasing
- Publishing is automatic: `.github/workflows/publish.yml` runs on every push to `main` and
  publishes each package (the root and every `packages/*`) whose `version` isn't on npm yet. To
  release one, bump its `version` in a PR; each package has its own version.
- Semver: changing or removing a rule or export is a breaking change for every consumer (minor
  bump while `0.x`, major after `1.0`); adding is a patch or minor. Say which in the PR.
- Auth is npm trusted publishing (OIDC), so no token is stored; only a brand-new package's first
  publish needs a short-lived `NPM_TOKEN` secret. Steps in `README.md` "Releasing".
- Check what would ship with `npm pack --dry-run` (part of `npm run check`).

## Dependency boundaries
- This repo depends on **nothing** in the workspace. It sits at the bottom of the graph.
- Shared libraries and leaf projects may consume these packages; this repo must never import from
  them, and must never reference `workspace-meta` (private). Packages here depend on each other only
  by their published names, and have no runtime dependencies outside this repo. A package that
  depends on another builds after it: the root `build` script lists the order (visual-lab before
  lab-player; docs-check and site-ui depend on nothing).
- No circular dependencies.

## Security & secret hygiene (PUBLIC REPO)
- **Only generic code and configuration.** Zero secrets, API keys, tokens, credentials, `.env` files,
  internal hostnames/endpoints, private notes, roadmaps or personal data.
- Private planning belongs in a private repo, never here.
- Before every commit: `git diff --cached` and confirm nothing project-specific or sensitive is staged.

## Tech stack standards
- TypeScript `strict` plus extra strictness flags (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).
- ESLint flat config with `typescript-eslint` strict + stylistic presets.
- ESM only (`"type": "module"`), Node >= 20.

## Code and test conventions
- Every file opens with a comment saying what it is for and how it fits; keep it true.
- A test that finds its own cases (by reading the code or the docs) first fails loudly if it found
  none, instead of passing with nothing checked.
- Test names are sentences stating the behaviour ("a forged signature is refused"), so the list
  reads as a spec.
- Tests make no network calls: outside services are replaced by small hand-written fakes.
- `npm test` also runs `docs-check` on this repo (root `package.json`): keep its docs passing.

## Commands
- `npm install` · `npm run lint` · `npm run build` (validates configs, builds every package) ·
  `npm test` (every package's tests, then `docs-check` on this repo) · `npm run check` (all of them plus `npm pack --dry-run` of each)

## README status rule
Before finishing a task or pushing, rewrite the `## Status` section of `README.md` (recent changes,
current state, next steps) so the next session has context without reading commit logs. Keep it short
and accurate; no secrets.
