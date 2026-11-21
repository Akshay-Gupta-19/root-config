# AGENT.md — packages/docs-check (`@akshayanimateddsa/docs-check`)

Read the root [`../../AGENT.md`](../../AGENT.md) first; these rules add to it. What the package is
and how to use it: [`README.md`](README.md).

## Rules
- **Mechanical checks only:** a check reports what a script can be sure of (a file is missing, a
  number repeats). Whether a description is still true, or a rule sits at the right level, is left
  to people and agents reading the docs; don't add heuristics that guess at meaning.
- **Generic only:** no repository, folder or person is named in the code. What differs between
  repositories (ADR folders, list files, sibling repo names, examples to skip) comes from the
  `"docsCheck"` block of the checked repo's `package.json`, typed in `src/files.ts`.
- **One function per check** in `src/checks.ts`, returning `Problem`s; `checkRepo` (`src/index.ts`)
  runs them all. A new check gets a test with a sample repository that shows it firing and a
  correct one that shows it quiet (`test/checks.test.js`).
- **False alarms are bugs:** when a real repo trips a check for something that isn't wrong, fix the
  check or add a config field; never ask repos to reword correct docs to please it.
- Zero runtime dependencies (Node built-ins only). Removing a check, renaming a config field or
  making a check stricter is a breaking change (minor bump while `0.x`): repos that passed may fail.
