// The colour themes: every theme in the dropdown (src/themes.ts) has its block in css/themes.css and
// every block is in the dropdown, so no option silently does nothing; every theme sets the whole
// palette, so every tone of visual-lab has a colour in every theme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES } from '../dist/index.js';

const css = readFileSync(new URL('../css/themes.css', import.meta.url), 'utf8');
const tokens = readFileSync(new URL('../../visual-lab/css/tokens.css', import.meta.url), 'utf8');
const blockOf = (selector) => css.match(new RegExp(`${selector.replace(/[[\]."]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
const themed = new Set([...css.matchAll(/\.vz\[data-theme="([\w-]+)"\]\s*\{/g)].map((m) => m[1]));
/** The palette colours the tones use (`.tone-x { --tone: var(--colour) }` in visual-lab). */
const palette = [...new Set([...tokens.matchAll(/--tone: var\((--[\w-]+)\)/g)].map((m) => m[1]))].filter((v) => !v.startsWith('--text'));

test('the theme list, the stylesheet and the tone palette were all found', () => {
  assert.ok(THEMES.length > 1 && themed.size > 0);
  assert.ok(palette.length >= 8, palette.join(' '));
});

test('every theme but the default (Midnight, set on .vz itself) has its own block, and every block a theme', () => {
  const [base, ...rest] = THEMES.map((t) => t.id);
  assert.equal(base, 'midnight');
  assert.deepEqual([...themed].sort(), rest.sort());
});

test('every theme sets every palette colour a tone uses, Midnight included', () => {
  const blocks = { midnight: blockOf('.vz'), ...Object.fromEntries([...themed].map((id) => [id, blockOf(`.vz[data-theme="${id}"]`)])) };
  for (const [id, block] of Object.entries(blocks)) {
    for (const colour of palette) assert.match(block, new RegExp(`\\s${colour}:`), `${id} sets ${colour}`);
  }
});

test('Midnight on .vz has the same palette as visual-lab\'s default tokens', () => {
  const value = (text, name) => text.match(new RegExp(`\\s${name}:\\s*([^;]+);`))?.[1];
  for (const colour of [...palette, '--bg', '--surface', '--text']) assert.equal(value(blockOf('.vz'), colour), value(tokens, colour), colour);
});

test('Spotlight is in the Neon group and sets the colours it relies on', () => {
  assert.deepEqual(THEMES.find((t) => t.id === 'spotlight'), { id: 'spotlight', label: 'Spotlight', group: 'Neon' });
  const block = blockOf('.vz[data-theme="spotlight"]');
  for (const token of ['--bg', '--text', '--vz-bg', '--vz-panel-bg', '--vz-node', '--vz-edge', '--ease']) assert.match(block, new RegExp(`${token}:`), token);
});
