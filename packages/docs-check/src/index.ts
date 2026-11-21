// @akshayanimateddsa/docs-check: checks that a repository's agent docs stay true to it.
// `checkRepo(root)` runs every check and returns the problems; the `docs-check` command (cli.ts)
// prints them and fails when there are any. Settings come from package.json's "docsCheck" block.
import { checkAdrs, checkLists, checkPairs, checkPaths, checkReadmeStatus, checkRuleTree } from './checks.js';
import type { Problem } from './checks.js';
import { loadRepo, readConfig } from './files.js';
import type { DocsCheckConfig } from './files.js';

export type { Problem } from './checks.js';
export type { DocsCheckConfig, Repo } from './files.js';
/** The single checks, for running one at a time. */
export { checkAdrs, checkLists, checkPairs, checkPaths, checkReadmeStatus, checkRuleTree, listFiles, pathsIn } from './checks.js';
/** Loading a repository (files and config) for the single checks. */
export { loadRepo, readConfig } from './files.js';

/** Runs every check on the repository at `root`; `config` defaults to its package.json "docsCheck" block. */
export function checkRepo(root: string, config: DocsCheckConfig = readConfig(root)): Problem[] {
  const repo = loadRepo(root, config);
  return [checkPairs, checkRuleTree, checkPaths, checkAdrs, checkLists, checkReadmeStatus].flatMap((check) => check(repo));
}
