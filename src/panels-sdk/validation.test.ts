import { describe, expect, it } from 'vitest';
import { cloneState } from './validation';

describe('bounded JSON panel state', () => {
  it('deep copies valid JSON and permits shared values without treating them as cycles', () => {
    const shared = { count: 1 };
    const source = { nested: [null, true, 1, 'text', shared], other: shared };
    const copy = cloneState(source);
    expect(copy).toEqual(source);
    shared.count = 2;
    expect(copy.other).toEqual({ count: 1 });
    expect(cloneState(Object.assign(Object.create(null), { value: 1 }))).toEqual({ value: 1 });
  });

  it('rejects non-object roots and non-JSON values at any depth', () => {
    for (const root of [null, [], 'value', 1, undefined]) expect(() => cloneState(root)).toThrow();
    for (const value of [undefined, () => {}, Symbol('x'), 1n, NaN, Infinity, -Infinity,
      new Date(), new Map(), new Set(), Object.create({ inherited: true })]) {
      expect(() => cloneState({ nested: [value] })).toThrow();
    }
  });

  it('rejects object and array cycles', () => {
    const object: Record<string, unknown> = {};
    object.self = object;
    const array: unknown[] = [];
    array.push(array);
    expect(() => cloneState(object)).toThrow();
    expect(() => cloneState({ array })).toThrow();
  });

  it('rejects prototype-related keys without modifying object prototypes', () => {
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      expect(() => cloneState({ nested: JSON.parse(`{"${key}":{"polluted":true}}`) })).toThrow();
    }
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('rejects excessively deep, numerous or large state values', () => {
    let deep: unknown = {};
    for (let i = 0; i < 14; i++) deep = { child: deep };
    expect(() => cloneState(deep)).toThrow('complex');
    expect(() => cloneState({ values: Array(5001).fill(null) })).toThrow('complex');
    expect(() => cloneState({ value: 'x'.repeat(65536) })).toThrow('64 KiB');
    expect(cloneState({ value: 'x'.repeat(1000) })).toEqual({ value: 'x'.repeat(1000) });
  });

  it('measures the size limit in UTF-8 bytes', () => {
    expect(() => cloneState({ value: '€'.repeat(30_000) })).toThrow('64 KiB');
    expect(cloneState({ value: '€'.repeat(10_000) })).toEqual({ value: '€'.repeat(10_000) });
  });

  it('rejects sparse arrays instead of skipping missing JSON values', () => {
    expect(() => cloneState({ values: new Array(3) })).toThrow();
    const values = [1, 2, 3];
    delete values[1];
    expect(() => cloneState({ values })).toThrow();
  });
});
