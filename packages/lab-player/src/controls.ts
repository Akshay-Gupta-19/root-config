/**
 * The playback bar: reset, previous, play/pause, next, jump to end, a scrubber, the step counter and
 * speed. Purely a view of the player: it owns no state. `tools` (view toggles, pickers) go at the
 * end of the bar.
 */
import { h } from '@akshayanimateddsa/visual-lab';
import { SPEEDS, type Player, type PlayerAction } from './player.js';
import { ICONS } from './icons.js';

export function createControls(player: Player<unknown>, tools: HTMLElement[] = []): HTMLDivElement {
  const button = (action: PlayerAction, label: string, extra = ''): HTMLButtonElement =>
    h('button', { class: `vz-btn ${extra}`, type: 'button', 'data-action': action, 'aria-label': label, title: label });

  const resetBtn = button('reset', 'Reset (Home)');
  const prevBtn = button('prev', 'Previous step (←)');
  const playBtn = button('toggle', 'Play (Space)', 'vz-btn--play');
  const nextBtn = button('next', 'Next step (→)');
  const endBtn = button('end', 'Jump to last step (End)');
  resetBtn.innerHTML = ICONS.reset;
  prevBtn.innerHTML = ICONS.prev;
  nextBtn.innerHTML = ICONS.next;
  endBtn.innerHTML = ICONS.end;

  const scrubber = h('input', { class: 'vz-scrub', type: 'range', min: 0, max: 0, value: 0, step: 1, 'aria-label': 'Step' });
  const counter = h('span', { class: 'vz-counter', 'aria-live': 'off' });
  const speedSelect = h(
    'select',
    { class: 'vz-speed', 'aria-label': 'Playback speed' },
    SPEEDS.map((sp) => h('option', { value: sp }, `${sp}×`)),
  );
  speedSelect.value = String(player.speed);

  const el = h(
    'div',
    { class: 'vz-controls' },
    h('div', { class: 'vz-controls-buttons' }, resetBtn, prevBtn, playBtn, nextBtn, endBtn),
    scrubber,
    counter,
    h('label', { class: 'vz-speed-wrap' }, h('span', {}, 'Speed'), speedSelect),
    tools.length ? h('div', { class: 'vz-tools' }, tools) : null,
  );

  el.addEventListener('click', (event) => {
    const action = (event.target as Element).closest<HTMLElement>('[data-action]')?.dataset['action'] as PlayerAction | undefined;
    if (action) player[action]();
  });
  scrubber.addEventListener('input', () => player.seek(Number(scrubber.value)));
  speedSelect.addEventListener('change', () => player.setSpeed(Number(speedSelect.value)));

  function renderPlaying(playing: boolean): void {
    playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
    const label = playing ? 'Pause (Space)' : 'Play (Space)';
    playBtn.setAttribute('aria-label', label);
    playBtn.title = label;
  }
  renderPlaying(false);

  player.on((event) => {
    if (event.type === 'state') {
      renderPlaying(event.playing);
      speedSelect.value = String(event.speed);
      return;
    }
    const { index, total } = event;
    const last = Math.max(0, total - 1);
    scrubber.max = String(last);
    scrubber.value = String(index);
    scrubber.style.setProperty('--progress', `${last ? (index / last) * 100 : 100}%`);
    counter.textContent = `Step ${index + 1} / ${total}`;
    resetBtn.disabled = prevBtn.disabled = index === 0;
    nextBtn.disabled = endBtn.disabled = index >= last;
    playBtn.disabled = total < 2;
  });

  return el;
}
