// The checks, each a function from a loaded repository to the problems it finds. They are
// mechanical: whether a description is still true, or a rule sits at the right level, is left to a
// person or an agent reading the docs. `checkRepo` (index.ts) runs them all.
import { posix } from 'node:path';
import type { Repo } from './files.js';

/** One thing that's wrong, in one file. */
export interface Problem {
  check: 'pairs' | 'rule-tree' | 'paths' | 'adrs' | 'lists' | 'readme-status';
  file: string;
  message: string;
}

const base = (file: string): string => file.split('/').pop() ?? file;
const dirOf = (file: string): string => posix.dirname(file);
const repoName = (repo: Repo): string => base(repo.root.replace(/\/+$/, ''));

/** Code blocks (``` fenced) of a markdown text, joined. */
const codeBlocks = (text: string): string[] => [...text.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].map(([, body]) => body ?? '');

/** Every `AGENT.md` has a `CLAUDE.md` beside it that loads it with `@AGENT.md`. */
export function checkPairs(repo: Repo): Problem[] {
  return repo.files.filter((file) => base(file) === 'AGENT.md').flatMap((agent): Problem[] => {
    const claude = dirOf(agent) === '.' ? 'CLAUDE.md' : `${dirOf(agent)}/CLAUDE.md`;
    if (!repo.files.includes(claude)) return [{ check: 'pairs', file: agent, message: `has no CLAUDE.md beside it (${claude})` }];
    if (!/^@AGENT\.md\s*$/m.test(repo.read(claude))) return [{ check: 'pairs', file: claude, message: 'does not load its AGENT.md (a line `@AGENT.md`)' }];
    return [];
  });
}

/**
 * The root `AGENT.md`'s rule tree names every other `AGENT.md` (by its folder and file name, e.g.
 * `kit/AGENT.md`), and every `.../AGENT.md` written in a rule file's code block exists.
 */
export function checkRuleTree(repo: Repo): Problem[] {
  const agents = repo.files.filter((file) => base(file) === 'AGENT.md');
  if (agents.length === 0) return [];
  if (!agents.includes('AGENT.md')) return [{ check: 'rule-tree', file: 'AGENT.md', message: 'the repository has AGENT.md files below its root but none at the root' }];
  const root = repo.read('AGENT.md');
  const problems: Problem[] = agents
    .filter((file) => file !== 'AGENT.md' && !root.includes(`${base(dirOf(file))}/AGENT.md`))
    .map((file) => ({ check: 'rule-tree', file: 'AGENT.md', message: `the rule tree does not name ${file}` }));
  const others = new Set([...(repo.config.otherRepos ?? []), repoName(repo)]);
  for (const agent of agents) {
    for (const block of codeBlocks(repo.read(agent))) {
      for (const [token] of block.matchAll(/[\w.-]+(?:\/[\w.-]+)*\/AGENT\.md/g)) {
        const first = token.split('/')[0] ?? '';
        if (others.has(first)) continue;
        if (!agents.some((file) => file === token || file.endsWith(`/${token}`))) {
          problems.push({ check: 'rule-tree', file: agent, message: `its rule tree names ${token}, which does not exist` });
        }
      }
    }
  }
  return problems;
}

const BUILD = /^(dist|build|out|node_modules|coverage)(\/|$)/;
const PATH_EXT = /\.(md|ts|tsx|js|mjs|cjs|json|jsonc|astro|css|html|ya?ml|sql|txt|sh|toml)$/;

/** File and folder paths written in backticks or as markdown link targets. */
export function pathsIn(text: string): string[] {
  const ticks = [...text.matchAll(/`([^`\s]+)`/g)].map(([, token]) => token ?? '');
  const links = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map(([, target]) => (target ?? '').replace(/#.*$/, ''));
  return [...ticks, ...links]
    .map((token) => token.replace(/[),.:;]+$/, '').replace(/^\.\//, ''))
    .filter((token) => PATH_EXT.test(token) || /[\w-]\/$/.test(token))
    .filter((token) => !/[<>*{}|$=]|NNNN|^[a-z]+:|^@|^\/|^#|\s/.test(token))
    .filter((token) => !/^\.[\w.]+$/.test(token) && !BUILD.test(token)); // a bare extension (`.ts`), build output
}

/** Whether a line (or the one before it) names one of `names`: its paths and references are another repo's. */
const namesOther = (lines: string[], i: number, names: string[]): boolean =>
  names.some((name) => (lines[i] ?? '').includes(name) || (lines[i - 1] ?? '').includes(name));

/** Whether `token` matches an `ignorePaths` entry: the same path, or one under an entry ending in `/`. */
const ignoredPath = (token: string, ignore: string[]): boolean =>
  ignore.some((entry) => token === entry || (entry.endsWith('/') && token.startsWith(entry)));

/**
 * Every file or folder a rule file (`AGENT.md`, `CLAUDE.md`) names exists in the repository: from
 * the doc's folder, from the root, or as the end of any path in it (a path may start with the
 * repository's own folder name). Paths outside the repository
 * (`../`), on a line naming another repository, or in `ignorePaths` are skipped.
 */
export function checkPaths(repo: Repo): Problem[] {
  const others = repo.config.otherRepos ?? [];
  const ignore = repo.config.ignorePaths ?? [];
  const own = new RegExp(`^${repoName(repo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  const all = [...repo.files, ...new Set(repo.files.flatMap((file) => file.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'))))];
  const problems: Problem[] = [];
  for (const doc of repo.files.filter((file) => /(^|\/)(AGENT|CLAUDE)\.md$/.test(file))) {
    const lines = repo.read(doc).split('\n');
    const reported = new Set<string>();
    lines.forEach((line, i) => {
      for (const token of pathsIn(line)) {
        const bare = token.replace(/\/$/, '').replace(own, ''); // `this-repo/x.md` is `x.md`
        if (reported.has(token) || ignoredPath(token, ignore) || namesOther(lines, i, others)) continue;
        if (others.includes(bare.split('/')[0] ?? '')) continue;
        if (bare.startsWith('../')) {
          const target = posix.normalize(posix.join(dirOf(doc), bare));
          if (target.startsWith('../') || repo.exists(target)) continue; // outside: a sibling repo's file
        } else if (repo.exists(posix.join(dirOf(doc), bare)) || repo.exists(bare) || all.some((file) => file.endsWith(`/${bare}`))) {
          continue;
        }
        reported.add(token);
        problems.push({ check: 'paths', file: doc, message: `names ${token}, which does not exist` });
      }
    });
  }
  return problems;
}

const SECTIONS = ['## Context', '## Decision', '## Alternatives considered', '## Consequences'];

/** ADRs are numbered 0001… with no gaps, follow the template, and match their folder's index one to one. */
export function checkAdrs(repo: Repo): Problem[] {
  const dirs = repo.config.adrDirs ?? (repo.exists('docs/decisions') ? ['docs/decisions'] : []);
  return dirs.flatMap((dir): Problem[] => {
    const prefix = dir.replace(/\/$/, '') + '/';
    const adrs = repo.files.filter((file) => file.startsWith(prefix) && /^\d{4}-.+\.md$/.test(file.slice(prefix.length))).sort();
    const problems: Problem[] = [];
    const numbers = adrs.map((file) => Number(base(file).slice(0, 4)));
    numbers.forEach((n, i) => {
      if (n !== i + 1) problems.push({ check: 'adrs', file: adrs[i] ?? dir, message: `is number ${n}, expected ${i + 1} (numbers run 0001, 0002, … with no gaps or repeats)` });
    });
    const statusOf = new Map<string, string>();
    for (const file of adrs) {
      const text = repo.read(file);
      const number = base(file).slice(0, 4);
      if (!text.startsWith(`# ${number}. `)) problems.push({ check: 'adrs', file, message: `does not start with its title line "# ${number}. Title"` });
      if (!/^Date: \d{4}-\d{2}-\d{2}\s*$/m.test(text)) problems.push({ check: 'adrs', file, message: 'has no "Date: YYYY-MM-DD" line' });
      const status = /^Status: (.+?)\s*$/m.exec(text)?.[1];
      if (status === undefined) problems.push({ check: 'adrs', file, message: 'has no "Status:" line' });
      else {
        statusOf.set(base(file), status.replace(/\s*\(.*\)$/, '')); // the index may leave out a note in brackets
        for (const [, by] of status.matchAll(/[Ss]uperseded by (\d{4})/g)) {
          if (!numbers.includes(Number(by))) problems.push({ check: 'adrs', file, message: `is superseded by ${by}, which does not exist` });
        }
      }
      for (const section of SECTIONS) {
        if (!new RegExp(`^${section}\\s*$`, 'm').test(text)) problems.push({ check: 'adrs', file, message: `has no "${section}" section` });
      }
    }
    const index = `${prefix}README.md`;
    if (!repo.files.includes(index)) {
      if (adrs.length > 0) problems.push({ check: 'adrs', file: index, message: 'is missing (the ADR index)' });
      return problems;
    }
    const rows = [...repo.read(index).matchAll(/^\|\s*\[(\d{4})\]\(([^)]+)\)\s*\|.*\|\s*([^|]+?)\s*\|\s*$/gm)];
    const listed = new Map<string, number>();
    for (const [, number, link, status] of rows) {
      const file = link ?? '';
      listed.set(file, (listed.get(file) ?? 0) + 1);
      if (!file.startsWith(`${number ?? ''}-`) || !adrs.includes(prefix + file)) {
        problems.push({ check: 'adrs', file: index, message: `lists ${number} (${file}), which is not an ADR in ${dir}` });
      } else if (statusOf.has(file) && statusOf.get(file) !== status) {
        problems.push({ check: 'adrs', file: index, message: `says ${number} is "${status ?? ''}", the ADR says "${statusOf.get(file) ?? ''}"` });
      }
    }
    for (const file of adrs) {
      const count = listed.get(base(file)) ?? 0;
      if (count !== 1) problems.push({ check: 'adrs', file: index, message: count === 0 ? `does not list ${base(file)}` : `lists ${base(file)} ${count} times` });
    }
    return problems;
  });
}

/** The roadmap list files a repository's config names. */
export function listFiles(repo: Repo): string[] {
  const specs = repo.config.lists ?? ['docs/roadmap/'];
  return [...new Set(specs.flatMap((spec) => {
    if (spec.startsWith('**/')) return repo.files.filter((file) => base(file) === spec.slice(3));
    if (spec.endsWith('/')) return repo.files.filter((file) => file.startsWith(spec) && file.endsWith('.md') && !file.slice(spec.length).includes('/'));
    return repo.files.includes(spec) ? [spec] : [];
  }))].sort();
}

const ITEM = /^\s*- (?:\[[ xX]\] )?\*\*([A-Z])(\d+)\./gm;

/**
 * Each list numbers its items (`- [ ] **F3. Title**`) with no number repeated, and every reference
 * like `F3` in the rule files, the root `README.md` and `ROADMAP.md`, and the lists names an item
 * (other docs, such as specs, use codes of their own; ADRs are never edited). A line that names, or follows one that
 * names, another repository refers to that repository's items, and is skipped.
 */
export function checkLists(repo: Repo): Problem[] {
  const problems: Problem[] = [];
  const items = new Set<string>();
  for (const file of listFiles(repo)) {
    const seen = new Set<string>();
    for (const [, letter, number] of repo.read(file).matchAll(ITEM)) {
      const id = `${letter ?? ''}${number ?? ''}`;
      if (seen.has(id)) problems.push({ check: 'lists', file, message: `numbers two items ${id} (a number is used once, for good)` });
      seen.add(id);
      items.add(id);
    }
  }
  if (items.size === 0) return problems;
  const letters = [...new Set([...items].map((id) => id[0]))].join('');
  const ref = new RegExp(`(?<![\\w./-])([${letters}])([1-9]\\d*)(?![\\w-])`, 'g');
  const ignore = new Set(repo.config.ignoreRefs ?? []);
  const others = repo.config.otherRepos ?? [];
  const lists = new Set(listFiles(repo));
  const adrDirs = (repo.config.adrDirs ?? ['docs/decisions']).map((dir) => dir.replace(/\/$/, '') + '/');
  const tracked = (file: string): boolean => lists.has(file) || /(^|\/)(AGENT|CLAUDE)\.md$|^(README|ROADMAP)\.md$/.test(file);
  for (const file of repo.files.filter((f) => tracked(f) && !adrDirs.some((dir) => f.startsWith(dir)))) {
    const missing = new Set<string>();
    const lines = repo.read(file).split('\n');
    lines.forEach((line, i) => {
      if (namesOther(lines, i, others)) return;
      for (const [id] of line.matchAll(ref)) {
        if (!items.has(id) && !ignore.has(id)) missing.add(id);
      }
    });
    for (const id of missing) problems.push({ check: 'lists', file, message: `refers to ${id}, which is not an item in any roadmap list` });
  }
  return problems;
}

/** The root README.md has a `## Status` section dated `_Last updated: YYYY-MM-DD_`. */
export function checkReadmeStatus(repo: Repo): Problem[] {
  if (repo.config.readmeStatus === false) return [];
  if (!repo.files.includes('README.md')) return [{ check: 'readme-status', file: 'README.md', message: 'is missing' }];
  const status = /^## Status\s*$([\s\S]*)/m.exec(repo.read('README.md'))?.[1];
  if (status === undefined) return [{ check: 'readme-status', file: 'README.md', message: 'has no "## Status" section' }];
  if (!/^_Last updated: \d{4}-\d{2}-\d{2}_\s*$/m.test(status)) return [{ check: 'readme-status', file: 'README.md', message: 'its Status section has no "_Last updated: YYYY-MM-DD_" line' }];
  return [];
}
