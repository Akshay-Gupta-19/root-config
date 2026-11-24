/**
 * The player's icons as inline SVG strings (24×24, `currentColor`), set with `innerHTML` on its
 * buttons: playback, the view toggles, copy, the recording frame and the shortcuts list.
 */
const stroke = 'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  prev: `<svg viewBox="0 0 24 24" ${stroke}><path d="M15 6l-6 6 6 6"/></svg>`,
  next: `<svg viewBox="0 0 24 24" ${stroke}><path d="M9 6l6 6-6 6"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" ${stroke}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  end: `<svg viewBox="0 0 24 24" ${stroke}><path d="M6 6l6 6-6 6M17 6v12"/></svg>`,
  code: `<svg viewBox="0 0 24 24" ${stroke}><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>`,
  expand: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" ${stroke}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>`,
  check: `<svg viewBox="0 0 24 24" ${stroke}><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  collapse: `<svg viewBox="0 0 24 24" ${stroke}><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`,
  // Three sliders: the page's inputs.
  inputs: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
  // A speech bubble with a question mark: the problem's question.
  question: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-5 4v-4h.5A2.5 2.5 0 0 1 4 13.5z"/><path d="M10 7.8a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4"/><circle cx="12" cy="13.2" r=".6" fill="currentColor"/></svg>`,
  // A phone with its top half highlighted: the recording frame.
  portrait: `<svg viewBox="0 0 24 24" ${stroke}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M6.5 12h11"/><path d="M9 5.5h6v4H9z" fill="currentColor" stroke="none"/></svg>`,
  // A keyboard: the shortcuts list.
  keyboard: `<svg viewBox="0 0 24 24" ${stroke}><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/></svg>`,
} as const;
