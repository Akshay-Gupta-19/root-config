#!/usr/bin/env node
// The `docs-check` command: runs every check on the current folder (or `--root <dir>`), prints the
// problems grouped by check, and exits with 1 when there are any. Run it from a repo's `npm test`.
import { resolve } from 'node:path';
import { checkRepo } from './index.js';

const at = process.argv.indexOf('--root');
const root = resolve(at > -1 ? (process.argv[at + 1] ?? '.') : '.');
const problems = checkRepo(root);

if (problems.length === 0) {
  console.warn('docs-check: no problems found.');
} else {
  for (const check of [...new Set(problems.map((p) => p.check))]) {
    console.error(`\n${check}:`);
    for (const p of problems.filter((q) => q.check === check)) console.error(`  ${p.file}: ${p.message}`);
  }
  console.error(`\ndocs-check: ${String(problems.length)} problem(s). Fix the docs (the code is the source of truth), or adjust "docsCheck" in package.json.`);
  process.exitCode = 1;
}
