import type { LocalizedText, PanelLocation } from '../panels-sdk/types';
import { PANEL_ID } from '../panels-sdk/validation';
export const PERMISSIONS = ['commands.session.new', 'events.workspace.changed'] as const;
export interface ExtensionManifest {
  id: string; version: string; apiVersion: 1; name: LocalizedText;
  permissions: (typeof PERMISSIONS)[number][];
  panels: { id: string; title: LocalizedText; entry: string; location?: PanelLocation; multiple?: boolean }[];
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
export function isJson(value: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 1000 && value.every(v => isJson(v, depth + 1));
  return isRecord(value) && Object.keys(value).length <= 1000 && Object.entries(value).every(([k,v]) => !['__proto__','prototype','constructor'].includes(k) && isJson(v, depth + 1));
}
export function isPanelState(value: unknown): boolean {
  return isRecord(value) && isJson(value) && JSON.stringify(value).length <= 32_768;
}
function localized(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0 && value.length <= 100;
  return isRecord(value) && typeof value.en === 'string' && Object.keys(value).length <= 20 && Object.entries(value).every(([k,v]) => /^[a-z]{2}(-[A-Z]{2})?$/.test(k) && typeof v === 'string' && v.trim().length > 0 && v.length <= 100);
}
export function validateManifest(value: unknown): ExtensionManifest {
  const fail = () => { throw new Error('Invalid extension manifest'); };
  if (!isRecord(value) || !isJson(value) || JSON.stringify(value).length > 32_768) return fail();
  if (typeof value.id !== 'string' || !/^[a-z][a-z0-9.-]{2,63}$/.test(value.id) || typeof value.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(value.version) || value.version.length > 50 || value.apiVersion !== 1 || !localized(value.name)) return fail();
  if (!Array.isArray(value.permissions) || value.permissions.length > PERMISSIONS.length || new Set(value.permissions).size !== value.permissions.length || value.permissions.some(p => !PERMISSIONS.includes(p as typeof PERMISSIONS[number]))) return fail();
  if (!Array.isArray(value.panels) || !value.panels.length || value.panels.length > 20) return fail();
  const ids = new Set<string>();
  for (const p of value.panels) {
    if (!isRecord(p) || typeof p.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(p.id) || ids.has(p.id) || !localized(p.title) || typeof p.entry !== 'string' || p.entry.length > 200 || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.html$/.test(p.entry) || (p.location !== undefined && !['left','right','above','below','within'].includes(p.location as string)) || (p.multiple !== undefined && typeof p.multiple !== 'boolean')) return fail();
    if (!PANEL_ID.test(`${value.id}.${p.id}`)) return fail();
    ids.add(p.id);
  }
  return JSON.parse(JSON.stringify(value)) as ExtensionManifest;
}
