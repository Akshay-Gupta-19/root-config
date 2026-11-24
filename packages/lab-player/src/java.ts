/**
 * A tiny Java syntax highlighter for one line of the code panel: comments, strings, numbers,
 * keywords, common types and method calls, as `tok-*` spans (coloured by `--syn-*` in
 * `css/player.css`, which each theme sets). Escapes everything else.
 */
import { escapeHtml } from '@akshayanimateddsa/visual-lab';

const KEYWORDS = new Set(
  'public private protected static final void return if else for while do new class interface extends implements throw throws try catch finally break continue switch case default this super null true false var import package record enum'.split(' '),
);
const TYPES = new Set(
  'int long double float boolean char byte short String Integer Long Boolean Character List ArrayList LinkedList Queue Deque ArrayDeque Stack Map HashMap Set HashSet TreeMap PriorityQueue Arrays Collections Math Node ListNode TreeNode IndexOutOfBoundsException IllegalStateException Object'.split(' '),
);

const TOKEN = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|\b(\d+)\b|\b([A-Za-z_]\w*)\b(\s*\()?/g;

/** One line of Java as HTML with `tok-com`, `tok-str`, `tok-num`, `tok-kw`, `tok-type` and `tok-fn` spans. */
export function highlightJava(line: string): string {
  let out = '';
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const [text, comment, str, num, word = '', call = ''] = match;
    out += escapeHtml(line.slice(last, match.index));
    last = match.index + text.length;
    if (comment) out += `<span class="tok-com">${escapeHtml(comment)}</span>`;
    else if (str) out += `<span class="tok-str">${escapeHtml(str)}</span>`;
    else if (num) out += `<span class="tok-num">${num}</span>`;
    else if (KEYWORDS.has(word)) out += `<span class="tok-kw">${word}</span>${call}`;
    else if (TYPES.has(word)) out += `<span class="tok-type">${word}</span>${call}`;
    else if (call) out += `<span class="tok-fn">${word}</span>${call}`;
    else out += escapeHtml(word);
  }
  return out + escapeHtml(line.slice(last));
}
