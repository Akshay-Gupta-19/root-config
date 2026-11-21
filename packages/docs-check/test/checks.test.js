// Each check finds what it should in a small sample repository written to a temporary folder (not a
// git repository, so the files are found by walking it), and finds nothing in a correct one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkRepo, pathsIn } from '../dist/index.js';

const ADR = (n, status = 'Accepted') =>
  `# ${n}. A decision\nDate: 2026-11-21\nStatus: ${status}\n## Context\nx\n## Decision\nx\n## Alternatives considered\nx\n## Consequences\nx\n`;

/** A correct sample repository; `changes` replaces or adds files (null deletes one). */
function sample(changes = {}) {
  const files = {
    'AGENT.md': '# Rules\n```\nAGENT.md\n└── tools/AGENT.md   the tools\n```\nSee `tools/run.ts` and [the list](docs/roadmap/features.md). F1 is next.\n',
    'CLAUDE.md': 'Read AGENT.md first.\n\n@AGENT.md\n',
    'tools/AGENT.md': '# Tool rules\nThe entry point is `run.ts`.\n',
    'tools/CLAUDE.md': '@AGENT.md\n',
    'tools/run.ts': 'export {};\n',
    'README.md': '# Sample\n\n## Status\n_Last updated: 2026-11-21_\n',
    'docs/decisions/0001-first.md': ADR('0001', 'Superseded by 0002'),
    'docs/decisions/0002-second.md': ADR('0002'),
    'docs/decisions/README.md': '| ADR | Decision | Status |\n|---|---|---|\n| [0001](0001-first.md) | first | Superseded by 0002 |\n| [0002](0002-second.md) | second | Accepted |\n',
    'docs/roadmap/features.md': '# Features\n- [ ] **F1. Build it**\n- [x] **F2. Done one**\n',
    'package.json': JSON.stringify({ name: 'sample', docsCheck: { otherRepos: ['sibling-repo'] } }),
    ...changes,
  };
  const root = mkdtempSync(join(tmpdir(), 'docs-check-'));
  for (const [file, text] of Object.entries(files)) {
    if (text === null) continue;
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

const messages = (root) => checkRepo(root).map((p) => `${p.check} ${p.file}: ${p.message}`);

test('a correct repository has no problems', () => {
  assert.deepEqual(messages(sample()), []);
});

test('an AGENT.md without a CLAUDE.md beside it, or one that does not load it, is reported', () => {
  assert.deepEqual(messages(sample({ 'tools/CLAUDE.md': null })), ['pairs tools/AGENT.md: has no CLAUDE.md beside it (tools/CLAUDE.md)']);
  assert.deepEqual(messages(sample({ 'tools/CLAUDE.md': 'Read AGENT.md.\n' })), ['pairs tools/CLAUDE.md: does not load its AGENT.md (a line `@AGENT.md`)']);
});

test('an AGENT.md missing from the rule tree, and a tree line naming no file, are reported', () => {
  const root = sample({ 'lib/AGENT.md': '# Lib\n', 'lib/CLAUDE.md': '@AGENT.md\n' });
  assert.deepEqual(messages(root), ['rule-tree AGENT.md: the rule tree does not name lib/AGENT.md']);
  const stale = sample({ 'AGENT.md': '```\nAGENT.md\n├── tools/AGENT.md\n└── gone/AGENT.md\n```\n' });
  assert.deepEqual(messages(stale), ['rule-tree AGENT.md: its rule tree names gone/AGENT.md, which does not exist']);
});

test('a path a rule file names that does not exist is reported; other repos, examples and build output are not', () => {
  const root = sample({
    'tools/AGENT.md': 'Uses `run.ts`, `old.ts` and `missing/`.\nSee `sibling-repo/AGENT.md`, `../outside/file.md`, `dist/index.js`, `.ts` files.\nIn sibling-repo: `docs/far.md`.\n',
  });
  assert.deepEqual(messages(root), [
    'paths tools/AGENT.md: names old.ts, which does not exist',
    'paths tools/AGENT.md: names missing/, which does not exist',
  ]);
  const ignored = sample({
    'tools/AGENT.md': 'Writes `inbox/` and `inbox/temp/` at run time.\n',
    'package.json': JSON.stringify({ docsCheck: { ignorePaths: ['inbox/'] } }),
  });
  assert.deepEqual(messages(ignored), []);
});

test('a path may start with the repository\'s own folder name', () => {
  const root = sample();
  writeFileSync(join(root, 'tools/AGENT.md'), `See \`${basename(root)}/tools/run.ts\`, not \`${basename(root)}/tools/gone.ts\`.\n`);
  assert.deepEqual(messages(root), [`paths tools/AGENT.md: names ${basename(root)}/tools/gone.ts, which does not exist`]);
});

test('pathsIn picks paths from backticks and links, and leaves commands, routes and placeholders', () => {
  assert.deepEqual(pathsIn('`a/b.ts` [x](docs/c.md#part) `npm run x` `/about/` `<id>.ts` `NNNN-x.md` `src/`'), ['a/b.ts', 'src/', 'docs/c.md']);
});

test('ADR gaps, a broken template, a dangling supersede and a stale index are reported', () => {
  const gap = sample({ 'docs/decisions/0002-second.md': null, 'docs/decisions/0003-third.md': ADR('0003') });
  assert.ok(messages(gap).includes('adrs docs/decisions/0003-third.md: is number 3, expected 2 (numbers run 0001, 0002, … with no gaps or repeats)'));
  const broken = sample({ 'docs/decisions/0002-second.md': '# 0002. Second\nStatus: Superseded by 0009\n## Context\n' });
  assert.deepEqual(messages(broken), [
    'adrs docs/decisions/0002-second.md: has no "Date: YYYY-MM-DD" line',
    'adrs docs/decisions/0002-second.md: is superseded by 0009, which does not exist',
    'adrs docs/decisions/0002-second.md: has no "## Decision" section',
    'adrs docs/decisions/0002-second.md: has no "## Alternatives considered" section',
    'adrs docs/decisions/0002-second.md: has no "## Consequences" section',
    'adrs docs/decisions/README.md: says 0002 is "Accepted", the ADR says "Superseded by 0009"',
  ]);
  const index = sample({ 'docs/decisions/README.md': '| [0001](0001-first.md) | first | Superseded by 0002 |\n| [0007](0007-gone.md) | gone | Accepted |\n' });
  assert.deepEqual(messages(index), [
    'adrs docs/decisions/README.md: lists 0007 (0007-gone.md), which is not an ADR in docs/decisions',
    'adrs docs/decisions/README.md: does not list 0002-second.md',
  ]);
});

test('an index status may leave out the note in brackets an ADR adds to its status', () => {
  assert.deepEqual(messages(sample({ 'docs/decisions/0001-first.md': ADR('0001', 'Superseded by 0002 (why, briefly)') })), []);
});

test('a list number used twice, and a reference to no item, are reported; other repos and ignored words are not', () => {
  const root = sample({
    'docs/roadmap/features.md': '- [ ] **F1. One**\n- [ ] **F1. Again**\n',
    'tools/AGENT.md': 'Needs F3 first, and T1 is not ours.\nsibling-repo keeps F8 and\nF9 too. P01 and F05 are spec codes.\n',
  });
  assert.deepEqual(messages(root), [
    'lists docs/roadmap/features.md: numbers two items F1 (a number is used once, for good)',
    'lists tools/AGENT.md: refers to F3, which is not an item in any roadmap list',
  ]);
  const ignored = sample({ 'tools/AGENT.md': 'Press F7 to mark.\n', 'package.json': JSON.stringify({ docsCheck: { ignoreRefs: ['F7'] } }) });
  assert.deepEqual(messages(ignored), []);
});

test('list files can be named by folder, by file and by a file name in any folder', () => {
  const root = sample({
    'reels/fitness/planned-reels.md': '- [ ] **R1. A reel**\n',
    'tools/AGENT.md': 'Fitness R1 comes after R2.\n',
    'package.json': JSON.stringify({ docsCheck: { lists: ['docs/roadmap/', '**/planned-reels.md'] } }),
  });
  assert.deepEqual(messages(root), ['lists tools/AGENT.md: refers to R2, which is not an item in any roadmap list']);
});

test('a README without a dated Status section is reported, unless turned off', () => {
  assert.deepEqual(messages(sample({ 'README.md': '# Sample\n' })), ['readme-status README.md: has no "## Status" section']);
  assert.deepEqual(messages(sample({ 'README.md': '# S\n## Status\nall good\n' })), ['readme-status README.md: its Status section has no "_Last updated: YYYY-MM-DD_" line']);
  assert.deepEqual(messages(sample({ 'README.md': null, 'package.json': JSON.stringify({ docsCheck: { readmeStatus: false } }) })), []);
});

test('the docs-check command prints the problems and exits with 1, or exits with 0 when there are none', () => {
  const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
  assert.match(execFileSync('node', [cli, '--root', sample()], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), /^$/);
  assert.throws(() => execFileSync('node', [cli, '--root', sample({ 'tools/CLAUDE.md': null })], { stdio: 'pipe' }), (error) =>
    error.status === 1 && String(error.stderr).includes('pairs:') && String(error.stderr).includes('has no CLAUDE.md beside it'));
});
