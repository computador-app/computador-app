import { useEffect, useMemo, useRef } from 'react';
import type { JsonValue, PanelContext, PanelState } from '../panels-sdk/types';
import { clientScript } from './client';
import { isJson, isPanelState, isRecord } from './manifest';

export interface SandboxPanelProps { context: PanelContext; html: string; permissions: readonly string[]; title: string }
export function handlePanelRequest(context: PanelContext, permissions: readonly string[], type: string, payload: unknown): JsonValue {
  if (type === 'ready' && payload === null) return true;
  if (type === 'setState' && isPanelState(payload)) { context.setState(payload as PanelState); return true; }
  if (type === 'command' && isRecord(payload) && payload.id === 'session.new' && (payload.payload === null || payload.payload === undefined) && permissions.includes('commands.session.new')) {
    if (!context.commands.execute('session.new')) throw new Error('Command unavailable');
    return true;
  }
  throw new Error('Unsupported or unauthorized panel request');
}
function snapshot(context: PanelContext) {
  return { instanceId: context.instanceId, panelType: context.panelType, locale: context.locale, theme: context.theme, state: context.state };
}
export function SandboxPanel({ context, html, permissions, title }: SandboxPanelProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const current = useRef({context, permissions});
  current.current = {context, permissions};
  const channel = useMemo(() => crypto.randomUUID(), [html, context.instanceId]);
  const active = useRef(false);
  const src = useMemo(() => { const url = new URL('panel-host.html', window.location.href); url.hash = channel; return url.href; }, [channel]);
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    const post = (message: Record<string, unknown>) => frame.current?.contentWindow?.postMessage({protocol: 1, channel, ...message}, '*');
    const cleanup = () => { if (disposed) return; disposed = true; active.current = false; unsubscribe?.(); post({type:'dispose'}); window.removeEventListener('message', receive); };
    const receive = (event: MessageEvent) => {
      if (disposed || event.source !== frame.current?.contentWindow || !isRecord(event.data)) return;
      const m = event.data;
      if (m.protocol !== 1 || m.channel !== channel || !isJson(m) || JSON.stringify(m).length > 40_000) return;
      if (m.type === 'bootstrap') {
        active.current = false;
        unsubscribe?.(); unsubscribe = undefined;
        if (html.length > 262_144) return;
        post({type: 'initialize', html, client: clientScript(channel)});
        return;
      }
      if (typeof m.id !== 'string' || !/^\d{1,12}$/.test(m.id) || typeof m.type !== 'string') return;
      try {
        if (!active.current && m.type !== 'ready') throw new Error('Panel not ready');
        const payload = handlePanelRequest(current.current.context, current.current.permissions, m.type, m.payload);
        if (m.type === 'ready') {
          active.current = true;
          post({type: 'context', payload: snapshot(current.current.context)});
          unsubscribe?.();
          if (current.current.permissions.includes('events.workspace.changed')) unsubscribe = current.current.context.events.subscribe('workspace.changed', payload => { if (!disposed && active.current && current.current.permissions.includes('events.workspace.changed') && isJson(payload) && JSON.stringify(payload).length <= 32_768) post({type:'event', payload}); });
        }
        post({type:'response', id:m.id, payload});
      } catch (error) { post({type:'response', id:m.id, error:error instanceof Error ? error.message : 'Panel request failed'}); }
    };
    window.addEventListener('message', receive);
    const removeDisposal = current.current.context.lifecycle.onDispose(cleanup);
    return () => { cleanup(); removeDisposal(); };
  }, [channel, html]);
  useEffect(() => {
    if (active.current) frame.current?.contentWindow?.postMessage({protocol:1, channel, type:'context', payload:snapshot(context)}, '*');
  }, [context, channel]);
  return <iframe ref={frame} title={title} src={src} sandbox="allow-scripts" referrerPolicy="no-referrer" style={{border:0, width:'100%', height:'100%', display:'block'}} />;
}
