// The code panel's Java highlighter (src/java.ts): each kind of token gets its class, and text is
// escaped, so code can never inject markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highlightJava } from '../dist/index.js';

test('keywords, types, numbers, strings, calls and comments get their tok-* classes', () => {
  const html = highlightJava('return map.get("a") + 42; // done');
  assert.match(html, /<span class="tok-kw">return<\/span>/);
  assert.match(html, /<span class="tok-fn">get<\/span>\(/);
  assert.match(html, /<span class="tok-str">&quot;a&quot;<\/span>|<span class="tok-str">"a"<\/span>/);
  assert.match(html, /<span class="tok-num">42<\/span>/);
  assert.match(html, /<span class="tok-com">\/\/ done<\/span>$/);
  assert.match(highlightJava('Map<String, Integer> seen'), /<span class="tok-type">Map<\/span>&lt;<span class="tok-type">String<\/span>/);
});

test('records and enums are keywords (Java 21)', () => {
  assert.match(highlightJava('record Point(int x) {}'), /<span class="tok-kw">record<\/span>/);
});

test('markup in the code is escaped', () => {
  assert.equal(highlightJava('a < b && c > d').includes('<b'), false);
  assert.match(highlightJava('a < b'), /a &lt; b/);
});
