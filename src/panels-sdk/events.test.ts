import { describe, expect, it, vi } from 'vitest';
import { PanelEventBus, PanelScope } from './events';

describe('panel event bus', () => {
  it('isolates subscriber payloads and exceptions', () => {
    const bus = new PanelEventBus();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      bus.subscribe('event', payload => {
        (payload as { count: number }).count = 99;
        throw new Error('Broken panel');
      });
      const healthy = vi.fn();
      bus.subscribe('event', healthy);
      const original = { count: 1 };
      bus.emit('event', original);
      expect(healthy).toHaveBeenCalledWith({ count: 1 });
      expect(original.count).toBe(1);
      expect(errors).toHaveBeenCalledTimes(1);
    } finally { errors.mockRestore(); }
  });

  it('unsubscribes only the intended listener and event', () => {
    const bus = new PanelEventBus();
    const first = vi.fn(), second = vi.fn();
    const off = bus.subscribe('first', first);
    bus.subscribe('second', second);
    off(); off();
    bus.emit('first', null);
    bus.emit('second', 1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(1);
  });

  it('does not let an old disposer remove later subscriptions to the same event', () => {
    const bus = new PanelEventBus();
    const oldOff = bus.subscribe('event', () => {});
    oldOff();
    const replacement = vi.fn();
    bus.subscribe('event', replacement);
    oldOff();
    bus.emit('event', 1);
    expect(replacement).toHaveBeenCalledWith(1);
  });
});

describe('per-instance panel scope', () => {
  it('cleans up subscriptions, including ones added after initial activation', () => {
    const bus = new PanelEventBus();
    const scope = new PanelScope();
    const first = vi.fn(), late = vi.fn();
    scope.track(bus.subscribe('event', first));
    bus.emit('event', 1);
    scope.track(bus.subscribe('event', late));
    scope.dispose();
    bus.emit('event', 2);
    expect(first).toHaveBeenCalledTimes(1);
    expect(late).not.toHaveBeenCalled();
    const cleanup = vi.fn();
    scope.track(cleanup);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(scope.active).toBe(false);
  });

  it('runs each cleanup once and continues after a broken cleanup', () => {
    const scope = new PanelScope();
    const manual = vi.fn(), healthy = vi.fn();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const remove = scope.track(manual);
      remove(); remove();
      scope.track(() => { throw new Error('Broken cleanup'); });
      scope.track(healthy);
      scope.dispose(); scope.dispose();
      expect(manual).toHaveBeenCalledTimes(1);
      expect(healthy).toHaveBeenCalledTimes(1);
      expect(errors).toHaveBeenCalledTimes(1);
      scope.activate();
      const remount = vi.fn();
      scope.track(remount);
      expect(remount).not.toHaveBeenCalled();
      scope.dispose();
      expect(remount).toHaveBeenCalledTimes(1);
    } finally { errors.mockRestore(); }
  });
});
