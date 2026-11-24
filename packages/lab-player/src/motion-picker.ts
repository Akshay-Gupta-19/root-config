/**
 * The Motion dropdown (Crisp / Smooth / Bouncy; `motion-choice.ts`). Hidden until the site calls
 * `setMotionAllowed(true)`. The choice applies to every visualizer on the page and is remembered in
 * this browser; each dropdown follows changes made from another one (a lab home's and a demo's
 * control bar stay in step).
 */
import { MOTIONS, h } from '@akshayanimateddsa/visual-lab';
import { currentMotion, motionAllowed, onMotionChange, setMotion } from './motion-choice.js';

/** The Motion select for a visualizer's control bar. */
export function createMotionPicker(): HTMLSelectElement {
  const select = h(
    'select',
    { class: 'vz-speed vz-motion', 'aria-label': 'Motion', title: 'Motion', 'data-motion-picker': '' },
    MOTIONS.map((m) => h('option', { value: m.id }, m.label)),
  );
  select.addEventListener('change', () => setMotion(select.value));
  const sync = (): void => {
    select.hidden = !motionAllowed();
    select.value = currentMotion().id;
  };
  onMotionChange(sync);
  sync();
  return select;
}

/** A labelled Motion dropdown (`label.lab-motion-field`) in `container`, shown only while the motion may be chosen. */
export function mountMotionSetting(container: HTMLElement): void {
  const select = createMotionPicker();
  select.classList.remove('vz-speed');
  container.replaceChildren(h('label', { class: 'lab-motion-field' }, h('span', {}, 'Motion'), select));
  const sync = (): void => {
    container.hidden = !motionAllowed();
  };
  onMotionChange(sync);
  sync();
}
