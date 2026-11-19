// The catalogue (catalogue.json) lists every export with one line, and nothing that isn't one
// (workspace Rule 1); importing the package touches no DOM (it loads in Node); every CSS file it
// names ships; POINTER_HEAD / POINTER_ROW match the pointer CSS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const catalogue = JSON.parse(readFileSync(new URL('../catalogue.json', import.meta.url), 'utf8'));
const lib = await import('../dist/index.js'); // no document here: a DOM touch at import would throw

test('every export is in the catalogue, and every catalogue entry is an export', () => {
  const listed = Object.keys({ ...catalogue.views, ...catalogue.helpers }).sort();
  assert.deepEqual(listed, Object.keys(lib).sort());
  for (const line of Object.values({ ...catalogue.views, ...catalogue.helpers })) assert.ok(line.length > 10);
});

test('every stylesheet in the catalogue exists', () => {
  for (const file of Object.keys(catalogue.css)) assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), file);
});

test('the pointer geometry matches .av-pointer in the CSS (arrow head + stem + gap, name row)', () => {
  const css = readFileSync(new URL('../css/visual-lab.css', import.meta.url), 'utf8');
  const rule = (selector) => css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)));
  const px = (block, prop) => Number(block.match(new RegExp(`\\s${prop}:\\s*(\\d+)px`))[1]);
  const head = rule('.av-pointer::before').match(/border-width:\s*0 \d+px (\d+)px/);
  const stem = rule('.av-pointer::after');
  assert.equal(Number(head[1]) + px(stem, 'height') + px(stem, 'margin-bottom'), lib.POINTER_HEAD);
  assert.match(rule('.av-pointer'), new RegExp(`font: 600 [\\d.]+rem/${lib.POINTER_ROW}px`));
  assert.match(css, new RegExp(`\\.av-pointer\\.is-long::after \\{ height: ${lib.POINTER_ROW + 12}px`), 'a long stem is one row longer');
});

test('pointers normalise from the short and long forms; hidden ones are dropped', () => {
  const list = lib.normalizePointers({ i: 2, mid: { at: 5, tone: 'found' }, gone: null });
  assert.deepEqual(list.map((p) => [p.name, p.at, p.color]), [['i', 2, 'var(--cyan)'], ['mid', 5, 'var(--green)']]);
  assert.equal(lib.edgeKey('b', 'a'), 'a-b');
  assert.equal(lib.edgeKey('b', 'a', true), 'b>a');
});

test('the motion curves end where they should, and the tween easing can be swapped', () => {
  for (const m of lib.MOTIONS) assert.equal(Math.round(m.ease(1) * 1000) / 1000, 1, m.id);
  assert.ok(lib.spring(0.3) > 1, 'the spring overshoots');
  lib.setMotionEase(() => lib.easeOutQuart);
  assert.equal(lib.motionEase(), lib.easeOutQuart);
});
