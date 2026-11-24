// The catalogue (catalogue.json) lists every export with one line, and nothing that isn't one
// (workspace Rule 1); importing the package touches no DOM (it loads in Node); every stylesheet it
// names ships.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const catalogue = JSON.parse(readFileSync(new URL('../catalogue.json', import.meta.url), 'utf8'));
const lib = await import('../dist/index.js'); // no document here: a DOM touch at import would throw

test('the package was found and has exports', () => {
  assert.ok(Object.keys(lib).length > 10);
});

test('every export is in the catalogue, and every catalogue entry is an export', () => {
  const entries = { ...catalogue.player, ...catalogue.parts, ...catalogue.settings, ...catalogue.page };
  assert.deepEqual(Object.keys(entries).sort(), Object.keys(lib).sort());
  for (const line of Object.values(entries)) assert.ok(line.length > 10);
});

test('every stylesheet in the catalogue exists, and every stylesheet is in it', () => {
  for (const file of Object.keys(catalogue.css)) assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), file);
  assert.deepEqual(Object.keys(catalogue.css).sort(), ['css/player.css', 'css/shell.css', 'css/themes.css']);
});
