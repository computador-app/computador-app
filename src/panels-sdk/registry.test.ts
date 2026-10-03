import { describe, expect, it, vi } from 'vitest';
import { PanelRegistry } from './registry';
import { panelTitle, type PanelDefinition } from './types';

const panel = (id: string, options: Partial<PanelDefinition> = {}): PanelDefinition => ({
  id, title: { en: 'Example', 'pt-BR': 'Exemplo' }, component: () => null,
  location: 'right', ...options,
});

describe('panel registration', () => {
  it('publishes stable snapshots only after a successful atomic registration', () => {
    const registry = new PanelRegistry();
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);
    const empty = registry.list();
    expect(registry.list()).toBe(empty);
    expect(() => registry.registerMany([panel('valid'), panel('invalid', { location: 'other' as never })])).toThrow();
    expect(registry.get('valid')).toBeUndefined();
    expect(registry.list()).toBe(empty);
    expect(listener).not.toHaveBeenCalled();
    registry.registerMany([panel('first'), panel('second')]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(registry.list().map(({ id }) => id)).toEqual(['first', 'second']);
    expect(registry.list()).toBe(registry.list());
    expect(Object.isFrozen(registry.list())).toBe(true);
    unsubscribe();
    registry.unregister('first');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate ids both within a batch and against existing definitions', () => {
    const registry = new PanelRegistry();
    expect(() => registry.registerMany([panel('same'), panel('same')])).toThrow();
    expect(registry.list()).toHaveLength(0);
    registry.register(panel('same'));
    expect(() => registry.registerMany([panel('new'), panel('same')])).toThrow();
    expect(registry.get('new')).toBeUndefined();
  });

  it('unregisters a batch without removing a later replacement', () => {
    const registry = new PanelRegistry();
    const dispose = registry.registerMany([panel('first'), panel('second')]);
    registry.unregister('first');
    registry.register(panel('first', { title: 'Replacement' }));
    dispose();
    dispose();
    expect(registry.list()).toHaveLength(1);
    expect(registry.get('first')?.title).toBe('Replacement');
  });

  it('copies author metadata and default state before registration', () => {
    const registry = new PanelRegistry();
    const definition = panel('example', { defaultState: { nested: { count: 1 } } });
    registry.register(definition);
    definition.title = 'Changed';
    (definition.defaultState!.nested as { count: number }).count = 2;
    expect(registry.get('example')?.title).toEqual({ en: 'Example', 'pt-BR': 'Exemplo' });
    expect(registry.get('example')?.defaultState).toEqual({ nested: { count: 1 } });
  });

  it('requires valid ids, titles and state versions', () => {
    const registry = new PanelRegistry();
    for (const definition of [panel('bad id'), panel('empty', { title: '' }),
      panel('fallback', { title: { 'pt-BR': 'Exemplo' } as never }),
      panel('version', { stateVersion: 0 }), panel('fraction', { stateVersion: 1.5 })]) {
      expect(() => registry.register(definition)).toThrow();
    }
    expect(registry.list()).toHaveLength(0);
  });

  it('exposes deeply immutable defaults so one consumer cannot change future instances', () => {
    const registry = new PanelRegistry();
    registry.register(panel('example', { defaultState: { nested: { count: 1 }, values: [1, { value: 2 }] } }));
    const state = registry.get('example')!.defaultState!;
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.nested)).toBe(true);
    expect(Object.isFrozen(state.values)).toBe(true);
    expect(Object.isFrozen((state.values as unknown[])[1])).toBe(true);
    expect(() => { (state.nested as { count: number }).count = 9; }).toThrow();
    expect(registry.get('example')!.defaultState!.nested).toEqual({ count: 1 });
  });

  it('enforces the registry capacity without partial registration', () => {
    const registry = new PanelRegistry();
    registry.registerMany(Array.from({ length: 63 }, (_, i) => panel(`panel-${i}`)));
    expect(() => registry.registerMany([panel('last'), panel('overflow')])).toThrow();
    expect(registry.list()).toHaveLength(63);
    registry.register(panel('last'));
    expect(registry.list()).toHaveLength(64);
  });

  it('resolves localized titles with an English fallback', () => {
    expect(panelTitle('Plain', 'pt-BR')).toBe('Plain');
    expect(panelTitle({ en: 'English' }, 'pt-BR')).toBe('English');
    expect(panelTitle({ en: 'English', 'pt-BR': 'Português' }, 'pt-BR')).toBe('Português');
  });
});
