import globals from 'globals';
import base from './eslint.config.base.js';

export default [
  ...base,
  // Package build output (the base config ignores only the root's dist/).
  { ignores: ['packages/*/dist/**'] },
  // The visual-lab and lab-player packages run in the browser.
  { files: ['packages/visual-lab/src/**', 'packages/lab-player/src/**'], languageOptions: { globals: globals.browser } },
];
