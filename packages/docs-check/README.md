# @akshayanimateddsa/docs-check

Checks that a repository's agent docs stay true to it. It is mechanical: it finds what a script can
be sure of, and leaves "is this description still right?" to a person or an agent.

| Check | What it reports |
| --- | --- |
| `pairs` | An `AGENT.md` with no `CLAUDE.md` beside it, or a `CLAUDE.md` that doesn't load it (`@AGENT.md`) |
| `rule-tree` | An `AGENT.md` the root `AGENT.md` doesn't name (as `folder/AGENT.md`), or a `.../AGENT.md` in a rule file's code block that doesn't exist |
| `paths` | A file or folder an `AGENT.md` / `CLAUDE.md` names (in backticks or as a link) that doesn't exist |
| `adrs` | ADR numbers with a gap, an ADR missing its title, `Date:`, `Status:` or one of the four sections, a "Superseded by" naming no ADR, an index (`README.md` in the ADR folder) that misses, repeats or mis-states an ADR |
| `lists` | A roadmap list that uses an item number twice (`- [ ] **F3. …**`), or a reference like `F3` in a rule file, the root `README.md`, `ROADMAP.md` or a list that names no item |
| `readme-status` | A root `README.md` without a `## Status` section dated `_Last updated: YYYY-MM-DD_` |

## Using it
```bash
npm install -D @akshayanimateddsa/docs-check
```

```jsonc
// package.json
{
  "scripts": { "test": "docs-check" },
  "docsCheck": {
    "adrDirs": ["docs/decisions"],               // default: docs/decisions, when it exists
    "lists": ["docs/roadmap/", "**/planned-reels.md"], // a folder, a file, or a file name in any folder
    "otherRepos": ["sibling-repo"],              // lines naming one are about that repo: skipped
    "ignorePaths": ["inbox/"],                   // paths named but made at run time, or examples
    "ignoreRefs": ["F9"],                        // words that look like item references but aren't
    "ignore": ["vendor/"],                       // folders not checked at all
    "readmeStatus": true
  }
}
```

`docs-check` checks the current folder (`--root <dir>` for another), prints the problems grouped by
check and exits with 1 when there are any. From code: `checkRepo(root)` returns them as data.

Files are found with `git ls-files` (tracked and untracked, honouring `.gitignore`), or by walking
the folder outside a git repository.

License: MIT
