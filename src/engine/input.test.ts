import { describe, expect, it } from 'vitest';
import { Input } from './input';

const event = (type: string, props: Record<string, unknown>) =>
  Object.assign(new Event(type), props);

function setup() {
  const target = new EventTarget();
  const input = new Input(target);
  const fire = (type: string, props: Record<string, unknown> = {}) =>
    target.dispatchEvent(event(type, props));
  return { input, fire };
}

describe('Input', () => {
  it('reports a key tap once, even if released before the step', () => {
    const { input, fire } = setup();
    fire('keydown', { code: 'KeyE' });
    fire('keyup', { code: 'KeyE' });
    input.beginStep();
    expect(input.wasPressed('KeyE')).toBe(true);
    expect(input.isDown('KeyE')).toBe(false);
    input.endStep();
    expect(input.wasPressed('KeyE')).toBe(false);
  });

  it('ignores mouse movement and buttons while the pointer is unlocked', () => {
    const { input, fire } = setup();
    fire('mousemove', { movementX: 10, movementY: 4 });
    fire('mousedown', { button: 0 });
    input.beginStep();
    expect(input.look).toEqual({ x: 0, y: 0 });
    expect(input.isDown('Mouse0')).toBe(false);
  });

  it('consumes mouse movement once per fixed step', () => {
    const { input, fire } = setup();
    input.setPointerLocked(true);
    fire('mousemove', { movementX: 10, movementY: -4 });
    fire('mousemove', { movementX: 5, movementY: 0 });
    expect(input.pendingLook).toEqual({ x: 15, y: -4 });
    input.beginStep();
    expect(input.look).toEqual({ x: 15, y: -4 });
    expect(input.pendingLook).toEqual({ x: 0, y: 0 });
    input.endStep();
    input.beginStep();
    expect(input.look).toEqual({ x: 0, y: 0 });
  });

  it('reports mouse buttons with edges while locked', () => {
    const { input, fire } = setup();
    input.setPointerLocked(true);
    fire('mousedown', { button: 2 });
    input.beginStep();
    expect(input.wasPressed('Mouse2')).toBe(true);
    expect(input.isDown('Mouse2')).toBe(true);
    input.endStep();
    expect(input.wasPressed('Mouse2')).toBe(false);
    expect(input.isDown('Mouse2')).toBe(true);
  });

  it('releases mouse buttons and drops pending look when the lock is lost', () => {
    const { input, fire } = setup();
    input.setPointerLocked(true);
    fire('mousedown', { button: 0 });
    fire('mousemove', { movementX: 3, movementY: 3 });
    input.setPointerLocked(false);
    expect(input.isDown('Mouse0')).toBe(false);
    expect(input.pendingLook).toEqual({ x: 0, y: 0 });
  });

  it('accepts injected look without a lock', () => {
    const { input } = setup();
    input.injectLook(7, 2);
    input.beginStep();
    expect(input.look).toEqual({ x: 7, y: 2 });
  });

  it('clears held keys on blur', () => {
    const { input, fire } = setup();
    fire('keydown', { code: 'KeyW' });
    fire('blur');
    expect(input.isDown('KeyW')).toBe(false);
  });

  it('reports a lost pointer lock for one step, and never without a lock first', () => {
    const { input } = setup();
    input.setPointerLocked(false);
    input.beginStep();
    expect(input.lockLost).toBe(false);
    input.endStep();
    input.setPointerLocked(true);
    input.setPointerLocked(false);
    input.beginStep();
    expect(input.lockLost).toBe(true);
    input.endStep();
    expect(input.lockLost).toBe(false);
    input.beginStep();
    expect(input.lockLost).toBe(false);
  });
});
