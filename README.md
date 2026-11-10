# root-config

Public, generic tooling configuration shared by the TypeScript repositories in this workspace.

| File | Purpose |
| --- | --- |
| `tsconfig.base.json` | Strict TypeScript compiler options (canonical copy) |
| `eslint.config.base.js` | Strict ESLint flat config (`typescript-eslint` strict + stylistic) |
| `.prettierrc.json` | Formatting rules |
| `.editorconfig` | Editor whitespace / line-ending rules |

Every repository in the workspace is an independent Git repo, so consumers currently **mirror**
these settings in their own `tsconfig.json` rather than extending this repo by relative path.
Once this package is published to npm, consumers can switch to:

```jsonc
{ "extends": "@akshayanimateddsa/root-config/tsconfig.base.json" }
```

```bash
npm install
npm run check
```

License: MIT

## Status
_Last updated: 2026-11-10_

**Recent changes**
- Initial scaffold: strict `tsconfig.base.json`, ESLint flat config, Prettier, EditorConfig, CI.

**Current state**
- Consumers mirror these settings; package is not yet published to npm.

**Next steps**
- Publish to npm so other repos can `extends` it directly.
