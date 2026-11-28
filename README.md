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
- [`@akshayanimateddsa/site-ui`](packages/site-ui/README.md): generic site components: an
  Outlook-style calendar (day, week, month) with 1:1 session booking, a modal dialog, and the pure
  date and slot maths behind them; themed with CSS variables.
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
`visual-lab`, `docs-check` and `lab-player`; `site-ui` is next). The first publish needs a token, because a trusted publisher can only be set
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
   environment empty, and tick **Allow npm publish** (without it npm allows only staged publishing,
   and the workflow's `npm publish` fails with `403 … OIDC permission denied`) → **Set up
   connection**. Then, on the same page, **Publishing access** → "Require two-factor authentication
   and disallow tokens" → **Update Package Settings**.
5. Delete the `NPM_TOKEN` secret on GitHub and the token on npmjs.com.
6. Publish once through the trusted publisher soon after setting it up (a patch bump with no code
   change will do): a trusted publisher that hasn't been used shows as expired after a while and has
   to be set up again. Later releases need nothing.

```bash
npm install
npm run check
```

License: MIT

## Status
_Last updated: 2026-11-28_

**Recent changes**
- `site-ui` 0.1.0 (new): the broad package for generic site components. An Outlook-style calendar
  (day, week, month; small month, time grid with a now line, overlap columns, drag to pick a span),
  the booking calendar (availability one-off or weekly, session lengths, requests to confirm or
  decline, a student view of open slots), a modal dialog, and the pure date, slot and layout maths
  (`site-ui/slots` for servers). Themed with `--cal-*` tokens.
- Rule: few, broad packages. New shared code joins the package that fits its kind (`AGENT.md`).
- Docs audit: `visual-lab`'s rules list the tone aliases `active` and `error`.
- `root-config` 0.1.1, `visual-lab` 0.2.1, `docs-check` 0.1.1, `lab-player` 0.2.1: the first releases
  through npm trusted publishing (no token).

**Current state**
- On npm: `root-config` 0.1.1, `visual-lab` 0.2.1, `lab-player` 0.2.1, `docs-check` 0.1.1.
  `site-ui` 0.1.0 is not published yet: its first publish needs the one-time token ("Releasing").
- `akshay-website`'s HLD lab uses the player and the page frame; the DSA site uses the player
  (vendored 0.1.0) and still has its own copy of the page frame until it switches.
- No repo `extends` the root tooling config yet.

**Next steps**
- Publish `site-ui` 0.1.0 ("Releasing" steps 1–6), then the DSA site vendors it for its `/calendar`.
- Other sites' labs build on `visual-lab` and `lab-player`; other generic site parts go into `site-ui`.
