import globals from 'globals';
import base from './eslint.config.base.js';

export default [
  ...base,
  // Package build output (the base config ignores only the root's dist/).
  { ignores: ['packages/*/dist/**'] },
  // The visual-lab, lab-player and site-ui packages run in the browser.
  { files: ['packages/visual-lab/src/**', 'packages/lab-player/src/**', 'packages/site-ui/src/**'], languageOptions: { globals: globals.browser } },
];
