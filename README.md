# root-config

Public collection of shared npm packages for the workspace, published under `@akshayanimateddsa`:
- `@akshayanimateddsa/root-config` (this folder): generic tooling configuration, below.
- [`@akshayanimateddsa/visual-lab`](packages/visual-lab/README.md): generic views for step-by-step
  algorithm animations (array, graph, tree, recursion tree), plain DOM and SVG.
Rules, release process and workspace conventions: [`AGENT.md`](AGENT.md).

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

One-time setup per new package (npm account `akshayanimateddsa`; done for `root-config`, needed
once for `visual-lab`). The first publish needs a token, because a trusted publisher can only be set
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
_Last updated: 2026-11-19_

**Recent changes**
- New package `@akshayanimateddsa/visual-lab` (`packages/visual-lab`): ArrayView, GraphView,
  TreeView, CallTreeView and their NodeLinkView engine, pointers, DOM helpers, tween and motion
  curves, ported to strict TypeScript from the Akshay Animated DSA Visual Lab, with its CSS, a
  catalogue of every export (`catalogue.json`) and tests. The repo is now npm workspaces; CI builds,
  tests and pack-checks every package, and `Publish` publishes each package whose version is new.
- `@akshayanimateddsa/root-config` `0.1.0` is on npm.

**Current state**
- `visual-lab` `0.1.0` is not on npm yet: its first publish needs the one-time token ("Releasing").
- Checked against the DSA lab: with its views replaced by this package, all of its browser tests pass.

**Next steps**
- First publish of `visual-lab`, then its trusted publisher (steps above).
- The DSA site loads it from its `public/vendor/`; then the other sites' labs build on it.
