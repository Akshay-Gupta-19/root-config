// Reads a repository for the checks: its file list (git's tracked and untracked files, honouring
// .gitignore; a plain walk when the folder isn't a git repository), its settings from the
// "docsCheck" block of package.json, and small path helpers. The checks themselves are in checks.ts.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

/** The "docsCheck" block of a repository's package.json. Every field is optional. */
export interface DocsCheckConfig {
  /** Folders that hold ADRs (`NNNN-title.md` plus a `README.md` index). Default `["docs/decisions"]`, when it exists. */
  adrDirs?: string[];
  /** Roadmap list files: a folder (every `.md` in it), a file, or a file name after a `**` folder (every file of that name, e.g. planned-reels.md in any folder). Default `["docs/roadmap/"]`. */
  lists?: string[];
  /** Names (or nicknames) of sibling repositories: a path or an item reference on a line naming one, or right after it, is that repo's and isn't checked. */
  otherRepos?: string[];
  /** Paths rule files may name that aren't in the repository (examples, files made at run time); an entry ending in `/` covers everything under it. */
  ignorePaths?: string[];
  /** Words that look like item references but aren't (e.g. a key name like `F9`). */
  ignoreRefs?: string[];
  /** Folders (relative to the root) whose files are not checked at all. */
  ignore?: string[];
  /** Whether the root README.md must have a dated `## Status` section. Default true. */
  readmeStatus?: boolean;
}

/** A repository as the checks see it. */
export interface Repo {
  root: string;
  /** Every file, relative to the root, with `/` separators. */
  files: string[];
  config: DocsCheckConfig;
  read: (file: string) => string;
  exists: (path: string) => boolean;
}

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.astro', '.wrangler', 'coverage']);

function walk(root: string, dir = ''): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(root, path) : [path];
  });
}

function listFiles(root: string): string[] {
  if (existsSync(join(root, '.git'))) {
    try {
      const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
      return out.split('\n').filter((file) => file && existsSync(join(root, file)));
    } catch {
      // git missing or not usable: fall back to walking the folder.
    }
  }
  return walk(root);
}

/** Reads the "docsCheck" block of `<root>/package.json` (an empty config when there is none). */
export function readConfig(root: string): DocsCheckConfig {
  const file = join(root, 'package.json');
  if (!existsSync(file)) return {};
  const pkg = JSON.parse(readFileSync(file, 'utf8')) as { docsCheck?: DocsCheckConfig };
  return pkg.docsCheck ?? {};
}

/** Loads a repository: its files (minus `config.ignore`) and its config. */
export function loadRepo(root: string, config: DocsCheckConfig = readConfig(root)): Repo {
  const ignore = (config.ignore ?? []).map((dir) => dir.replace(/\/$/, '') + '/');
  const all = listFiles(root);
  const known = new Set(all);
  const dirs = new Set(all.flatMap((file) => file.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'))));
  return {
    root,
    files: all.filter((file) => !ignore.some((dir) => file.startsWith(dir))).sort(),
    config,
    read: (file) => readFileSync(join(root, file), 'utf8'),
    exists: (path) => {
      const clean = posix.normalize(path).replace(/\/$/, '');
      if (known.has(clean) || dirs.has(clean)) return true;
      // Also true for ignored files (git-ignored files on disk count as existing, e.g. a .env.example's folder).
      return existsSync(join(root, clean));
    },
  };
}
