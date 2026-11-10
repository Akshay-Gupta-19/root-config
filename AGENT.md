# AGENT.md — root-config

## Repository scope & purpose
- **Type:** Public shared tooling configuration (open source, MIT).
- **Contains:** generic TypeScript, ESLint, Prettier and EditorConfig settings only.
- **Not deployed** and not an application. It is a configuration base other repos mirror or extend.

## Dependency boundaries
- This repo depends on **nothing** in the workspace. It sits at the bottom of the graph.
- Shared libraries and leaf projects may consume these configs; this repo must never import from
  them, and must never reference `workspace-meta` (private).
- No circular dependencies.

## Security & secret hygiene (PUBLIC REPO)
- **Only generic configuration.** Zero secrets, API keys, tokens, credentials, `.env` files,
  internal hostnames/endpoints, private notes, roadmaps or personal data.
- Private planning belongs in `workspace-meta`, never here.
- Before every commit: `git diff --cached` and confirm nothing project-specific or sensitive is staged.

## Tech stack standards
- TypeScript `strict` plus extra strictness flags (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).
- ESLint flat config with `typescript-eslint` strict + stylistic presets.
- ESM only (`"type": "module"`), Node >= 20.
- Changing a rule here is a breaking change for every consumer: bump the version and note it in the
  commit message.

## Commands
- `npm install` · `npm run lint` · `npm run build` (validates configs) · `npm run check`
