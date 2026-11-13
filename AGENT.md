# AGENT.md — root-config

## Start here: rule tree
Every task starts from this file. This repo is flat, so this file holds all of its rules.
```
AGENT.md                     ← you are here: all rules for this repo
├── scripts/validate.mjs     config sanity check (`npm run build`)
└── .github/workflows/ci.yml lint + validate on every push to main and every PR
```
If a folder ever needs rules of its own, give it an `AGENT.md` and add it to this tree in the same
change.

## Workspace conventions (every repo follows these)
- **Rule tree, top-down.** Each repo's root `AGENT.md` starts with a rule tree mapping every folder
  to its rule file. A task always starts at the root `AGENT.md`; the agent finds the folder for the
  requested kind of work and reads every rule file on the path down, top to bottom. Lower levels add
  to their parents' rules and win where they say they override.
- Middle levels have an `AGENT.md`; leaves have a `README.md` that opens with a "don't start here,
  read the root `AGENT.md`" line. Each rule lives at the narrowest level it applies to.
- Adding a folder means, in the same change: add it to the tree and give it its rule file.
- A root `CLAUDE.md` loads `AGENT.md` so agents read it automatically.
- **LGTM means go.** When the owner replies "LGTM" (or a clear yes) to a proposed plan, carry it out
  without waiting for more instructions: make the changes, run the checks, commit, push to the
  working branch and open a pull request, then report the PR link. Stop and ask only if something
  comes up that the approved plan doesn't cover.

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

## README status rule
Before finishing a task or pushing, rewrite the `## Status` section of `README.md` (recent changes,
current state, next steps) so the next session has context without reading commit logs. Keep it short
and accurate; no secrets.
