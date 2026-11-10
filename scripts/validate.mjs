// Sanity check: shared JSON configs parse and the ESLint config loads.
import { readFileSync } from 'node:fs';

for (const file of ['tsconfig.base.json', '.prettierrc.json', 'package.json']) {
  JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
  console.warn(`valid: ${file}`);
}
const eslint = await import('../eslint.config.base.js');
if (!Array.isArray(eslint.default)) throw new Error('eslint.config.base.js must export an array');
console.warn('valid: eslint.config.base.js');
