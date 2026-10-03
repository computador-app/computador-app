import { describe, expect, it } from 'vitest';
import { isPanelState, validateManifest } from './manifest';
const manifest = {id:'example.counter',version:'1.0.0',apiVersion:1,name:{en:'Counter', 'pt-BR':'Contador'},permissions:['commands.session.new'],panels:[{id:'counter',title:'Counter',entry:'panels/counter.html'}]};
describe('extension manifest trust boundary', () => {
  it('accepts a valid portable manifest and returns a defensive copy', () => { const result = validateManifest(manifest); expect(result).toEqual(manifest); expect(result).not.toBe(manifest); });
  it.each(['../secret.html','/absolute.html','https://evil.test/panel.html','file:///secret.html','nested/../../secret.html','nested\\secret.html','%2e%2e/secret.html'])('rejects unsafe entry %s', entry => { expect(() => validateManifest({...manifest,panels:[{...manifest.panels[0],entry}]})).toThrow(); });
  it('rejects unsupported capabilities, APIs and duplicate identities', () => {
    for (const override of [{permissions:['desktop.exec']},{apiVersion:2},{panels:[manifest.panels[0],manifest.panels[0]]},{version:'latest'},{permissions:['commands.session.new','commands.session.new']}]) expect(() => validateManifest({...manifest,...override})).toThrow();
  });
  it('bounds the combined extension and panel identity to the registry limit', () => {
    const id = 'a'.repeat(64);
    const boundary = { ...manifest, id, panels: [{ ...manifest.panels[0], id: 'b'.repeat(55) }] };
    expect(validateManifest(boundary)).toEqual(boundary);
    for (const length of [56, 64]) {
      expect(() => validateManifest({ ...boundary, panels: [{ ...manifest.panels[0], id: 'b'.repeat(length) }] })).toThrow('Invalid extension manifest');
    }
  });
  it('rejects polluted, non-JSON, deep and oversized states', () => {
    const inherited = Object.create({admin:true}); inherited.count=1;
    expect(isPanelState(inherited)).toBe(false);
    expect(isPanelState(JSON.parse('{"__proto__":{}}'))).toBe(false);
    expect(isPanelState({count:NaN})).toBe(false);
    expect(isPanelState({text:'x'.repeat(40_000)})).toBe(false);
    expect(isPanelState({count:1,items:[null,true,'text']})).toBe(true);
  });
});
