import globals from 'globals';
import base from './eslint.config.base.js';

export default [
  ...base,
  // Package build output (the base config ignores only the root's dist/).
  { ignores: ['packages/*/dist/**'] },
  // The visual-lab package runs in the browser.
  { files: ['packages/visual-lab/src/**'], languageOptions: { globals: globals.browser } },
];
