# root-config

Public collection of shared npm packages for the workspace, published under `@akshayanimateddsa`.
Today it holds one package, `@akshayanimateddsa/root-config`: generic tooling configuration.
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

One-time setup (npm account `akshayanimateddsa`). The first publish needs a token, because a
trusted publisher can only be set on a package that already exists:
1. npmjs.com → avatar → **Access Tokens** → **Generate New Token** → **Granular Access Token**:
   name `root-config first publish`, expiration 7 days, **Packages and scopes** → **Read and write**
   → **All packages**, tick **Bypass two-factor authentication**. Generate and copy it.
2. GitHub → this repo → **Settings** → **Secrets and variables** → **Actions** → **New repository
   secret**: name `NPM_TOKEN`, paste, **Add secret**.
3. Merge to `main` (or **Actions** → **Publish** → **Run workflow**): `0.1.0` is published.
4. npmjs.com → the package `@akshayanimateddsa/root-config` → **Settings** → **Trusted Publisher** →
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
- Ready to publish: `private` removed, `publishConfig` (public, npm provenance), optional peer
  dependencies for the ESLint config, `Publish` workflow (npm trusted publishing on push to `main`),
  `npm pack --dry-run` in CI and `npm run check`.
- Scope widened from "tooling config" to a public package collection; generic visual-lab building
  blocks are planned as a second package (rules in `AGENT.md`).

**Current state**
- `0.1.0` not yet on npm: waiting for the one-time setup ("Releasing" above).
- Consumers still mirror these settings.

**Next steps**
- One-time setup and publish `0.1.0`; then switch consumers to `extends` the package.
- Add the visual-lab building-blocks package when the DSA lab's shared shapes are extracted.
