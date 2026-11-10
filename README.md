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
