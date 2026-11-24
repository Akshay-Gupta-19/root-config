// The motion setting (src/motion-choice.ts) in Node: Smooth until the page allows the choice, then the
// chosen motion, and the package's tweens ease with it. (The curves are tested in visual-lab.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motionEase } from '@akshayanimateddsa/visual-lab';
import { currentMotion, motionAllowed, setMotion, setMotionAllowed } from '../dist/index.js';

test('until a page allows the choice, the motion is Smooth whatever is chosen', () => {
  assert.equal(motionAllowed(), false);
  setMotion('bouncy');
  assert.equal(currentMotion().id, 'smooth');
});

test('once allowed, the chosen motion applies, and tweens ease with it', () => {
  setMotionAllowed(true); // no localStorage in Node: starts from the default, Smooth
  assert.equal(currentMotion().id, 'smooth');
  setMotion('crisp');
  assert.equal(currentMotion().id, 'crisp');
  assert.equal(motionEase(), currentMotion().ease);
  setMotion('no-such-motion');
  assert.equal(currentMotion().id, 'crisp', 'an unknown motion is ignored');
  setMotionAllowed(false);
  assert.equal(currentMotion().id, 'smooth');
});
