import { describe, expect, it, vi } from 'vitest';
import { ExtensionManager, type ExtensionBundle } from './manager';
import { PanelRegistry } from '../panels-sdk/registry';

const bundle = (): ExtensionBundle => ({
  manifest: { id: 'example.tools', version: '1.0.0', apiVersion: 1,
    name: { en: 'Tools', 'pt-BR': 'Ferramentas' }, permissions: [],
    panels: [
      { id: 'notes', title: 'Notes', entry: 'notes.html', multiple: true, location: 'left' },
      { id: 'counter', title: 'Counter', entry: 'counter.html' },
    ],
  },
  files: { 'notes.html': '<p>Notes</p>', 'counter.html': '<p>Counter</p>' },
});

describe('extension manager', () => {
  it('installs metadata without activating panels and publishes stable snapshots', () => {
    const registry = new PanelRegistry();
    const manager = new ExtensionManager(registry);
    const listener = vi.fn();
    const off = manager.subscribe(listener);
    const empty = manager.list();
    expect(manager.list()).toBe(empty);
    manager.install(bundle());
    expect(manager.list()).not.toBe(empty);
    expect(manager.list()).toBe(manager.list());
    expect(manager.list()[0]).toMatchObject({ enabled: false, manifest: { id: 'example.tools' } });
    expect(registry.list()).toHaveLength(0);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    manager.enable('example.tools');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('enables, disables and re-enables all contributed panels together', () => {
    const registry = new PanelRegistry();
    const manager = new ExtensionManager(registry);
    manager.install(bundle());
    manager.enable('example.tools');
    manager.enable('example.tools');
    expect(registry.list()).toHaveLength(2);
    expect(registry.get('example.tools.notes')).toMatchObject({ owner: 'example.tools', multiple: true, location: 'left' });
    expect(registry.get('example.tools.counter')).toMatchObject({ multiple: false, location: 'right' });
    expect(manager.list()[0].enabled).toBe(true);
    manager.disable('example.tools');
    manager.disable('example.tools');
    expect(registry.list()).toHaveLength(0);
    expect(manager.list()[0].enabled).toBe(false);
    manager.enable('example.tools');
    expect(registry.list()).toHaveLength(2);
    manager.uninstall('example.tools');
    expect(registry.list()).toHaveLength(0);
    expect(manager.list()).toHaveLength(0);
  });

  it('leaves every contribution disabled on registry conflict and supports retry', () => {
    const registry = new PanelRegistry();
    const manager = new ExtensionManager(registry);
    const disposeConflict = registry.register({ id: 'example.tools.counter', title: 'Existing', component: () => null, location: 'left' });
    manager.install(bundle());
    const snapshot = manager.list();
    expect(() => manager.enable('example.tools')).toThrow();
    expect(manager.list()).toBe(snapshot);
    expect(manager.list()[0].enabled).toBe(false);
    expect(registry.get('example.tools.notes')).toBeUndefined();
    expect(registry.get('example.tools.counter')?.title).toBe('Existing');
    disposeConflict();
    manager.enable('example.tools');
    expect(registry.list()).toHaveLength(2);
    expect(manager.list()[0].enabled).toBe(true);
  });

  it('rejects invalid or incomplete bundles without creating installed records', () => {
    const manager = new ExtensionManager(new PanelRegistry());
    const missing = bundle();
    delete missing.files['counter.html'];
    const blank = bundle(); blank.files['counter.html'] = '  ';
    const oversized = bundle(); oversized.files['counter.html'] = 'x'.repeat(262145);
    for (const invalid of [missing, blank, oversized, { ...bundle(), manifest: {} }]) {
      expect(() => manager.install(invalid)).toThrow();
      expect(manager.list()).toHaveLength(0);
    }
    expect(() => manager.enable('missing')).toThrow();
    manager.install(bundle());
    expect(() => manager.install(bundle())).toThrow('already installed');
    expect(manager.list()).toHaveLength(1);
  });

  it('defensively copies installation metadata from the supplied bundle', () => {
    const registry = new PanelRegistry();
    const manager = new ExtensionManager(registry);
    const source = bundle();
    manager.install(source);
    (source.manifest as { panels: { title: string }[] }).panels[0].title = 'Changed';
    manager.enable('example.tools');
    expect(registry.get('example.tools.notes')?.title).toBe('Notes');
  });
});
