/** Runs only in the opaque-origin sandbox; never in the application renderer. */
export function clientScript(channel: string): string {
  return `(() => {
    const channel = ${JSON.stringify(channel)};
    let sequence = 0, context = null, disposed = false;
    const pending = new Map(), listeners = new Map();
    let readyResolve;
    const ready = new Promise(resolve => readyResolve = resolve);
    const send = (type, payload) => {
      if (disposed) return Promise.reject(new Error('Panel disposed'));
      const id = String(++sequence);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('Panel request timed out')); }, 10000);
        pending.set(id, {resolve, reject, timer});
        parent.postMessage({protocol:1, channel, id, type, payload}, '*');
      });
    };
    const emit = (name, value) => { for (const cb of listeners.get(name) || []) { try { cb(value); } catch {} } };
    const receive = event => {
      const m = event.data;
      if (event.source !== parent || !m || m.protocol !== 1 || m.channel !== channel) return;
      if (m.type === 'context') { context = Object.freeze(m.payload); readyResolve(context); emit('context', context); }
      if (m.type === 'event') emit('workspace.changed', m.payload);
      if (m.type === 'response') { const p = pending.get(m.id); if (p) {clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(new Error(m.error)) : p.resolve(m.payload);} }
      if (m.type === 'dispose') { disposed = true; emit('dispose'); for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('Panel disposed')); } pending.clear(); listeners.clear(); removeEventListener('message', receive); }
    };
    addEventListener('message', receive);
    window.harnessPanel = Object.freeze({
      get context() { return context; }, ready,
      setState: state => send('setState', state),
      execute: (id, payload) => send('command', {id, payload: payload === undefined ? null : payload}),
      on: (name, fn) => { if (!['context','workspace.changed','dispose'].includes(name) || typeof fn !== 'function') throw new Error('Unsupported event'); if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); return () => listeners.get(name)?.delete(fn); }
    });
    send('ready', null).catch(() => {});
  })();`;
}
