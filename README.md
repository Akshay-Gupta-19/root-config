# root-config

Public collection of shared npm packages for the workspace, published under `@akshayanimateddsa`:
- `@akshayanimateddsa/root-config` (this folder): generic tooling configuration, below.
- [`@akshayanimateddsa/visual-lab`](packages/visual-lab/README.md): generic views for step-by-step
  algorithm animations (array, graph, tree, recursion tree), plain DOM and SVG.
- [`@akshayanimateddsa/lab-player`](packages/lab-player/README.md): the step player for visual labs
  (snapshot frames, controls, code and variables panels, shortcuts, fullscreen modes, nine themes,
  motion), built on `visual-lab`.
- [`@akshayanimateddsa/docs-check`](packages/docs-check/README.md): a command that checks a
  repository's agent docs stay true to it (rule files, ADRs, roadmap lists, README status).
Technical rules and the release process for agents: [`AGENT.md`](AGENT.md) (loaded by `CLAUDE.md`).

| File | Purpose |
| --- | --- |
| `tsconfig.base.json` | Strict TypeScript compiler options (canonical copy) |
| `eslint.config.base.js` | Strict ESLint flat config (`typescript-eslint` strict + stylistic) |
| `.prettierrc.json` | Formatting rules |
| `.editorconfig` | Editor whitespace / line-ending rules |

## Using it
```bash
npm install -D @akshayanimateddsa/root-config
```

```jsonc
// tsconfig.json
{ "extends": "@akshayanimateddsa/root-config/tsconfig.base.json" }
```

```js
// eslint.config.js (also install eslint, @eslint/js, typescript-eslint and globals)
import base from '@akshayanimateddsa/root-config/eslint';
export default [...base];
```

```jsonc
// package.json
{ "prettier": "@akshayanimateddsa/root-config/prettier" }
```

## Releasing
Bump `version` in `package.json` in a PR; merging it into `main` publishes it
(`.github/workflows/publish.yml`) through npm **trusted publishing**: no stored token.

One-time setup per new package (npm account `akshayanimateddsa`; done for `root-config`,
`visual-lab` and `docs-check`; needed once for `lab-player`). The first publish needs a token, because a trusted publisher can only be set
on a package that already exists:
1. npmjs.com → avatar → **Access Tokens** → **Generate New Token** → **Granular Access Token**:
   name `<package> first publish`, expiration 7 days, **Packages and scopes** → **Read and write**
   → **All packages**, tick **Bypass two-factor authentication**. Generate and copy it.
2. GitHub → this repo → **Settings** → **Secrets and variables** → **Actions** → **New repository
   secret**: name `NPM_TOKEN`, paste, **Add secret**.
3. Merge to `main` (or **Actions** → **Publish** → **Run workflow**): the new package's `0.1.0` is
   published (packages already on npm are skipped).
4. npmjs.com → the new package (e.g. `@akshayanimateddsa/visual-lab`) → **Settings** → **Trusted Publisher** →
   **GitHub Actions**: owner `Akshay-Gupta-19`, repository `root-config`, workflow `publish.yml`,
   environment empty → **Set up connection**. Then, on the same page, **Publishing access** →
   "Require two-factor authentication and disallow tokens" → **Update Package Settings**.
5. Delete the `NPM_TOKEN` secret on GitHub and the token on npmjs.com. Later releases need nothing.

```bash
npm install
npm run check
```

License: MIT

## Status
_Last updated: 2026-11-24_

**Recent changes**
- New package `@akshayanimateddsa/lab-player` 0.1.0 (`packages/lab-player`): the DSA Visual Lab's
  step player moved here (trace, player, the lab box with controls, code and variables panels,
  shortcuts, fullscreen modes, the nine themes, the motion setting, legend, callout), in TypeScript,
  with site-specific parts as options; catalogue and tests.
- `visual-lab` 0.2.0: tones `unreviewed`, `waiting`, `existing`, `pressure`, `warning` and the palette
  colours `--indigo`, `--orange` (set in all nine themes).
- New package `docs-check` (the `docs-check` command); this repo runs it in `npm test`.

**Current state**
- On npm: `root-config` 0.1.0, `visual-lab` 0.1.0, `docs-check` 0.1.0.
- Not on npm yet: `visual-lab` 0.2.0 and `lab-player` 0.1.0. Publishing runs in GitHub Actions,
  which has no minutes until 2026-12-01; `lab-player`'s first publish also needs the one-time token
  (Releasing).
- `visual-lab` is used by the Akshay Animated DSA Visual Lab; it moves to `lab-player` once published.

**Next steps**
- Publish `visual-lab` 0.2.0 and `lab-player` 0.1.0 (one-time token for `lab-player`, then its
  trusted publisher).
- Other sites' labs build on both; generic views they need go into `visual-lab`, player parts into
  `lab-player`.
