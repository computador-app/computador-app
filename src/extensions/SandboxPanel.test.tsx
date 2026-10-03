// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PanelContext } from '../panels-sdk/types';
import { handlePanelRequest, SandboxPanel } from './SandboxPanel';
const context = (): PanelContext => ({instanceId:'one', panelType:'sample.counter', locale:'en', theme:'dark',state:{count:0},setState:vi.fn(),commands:{execute:vi.fn(() => true)},events:{subscribe:vi.fn(() => vi.fn())},lifecycle:{onDispose:vi.fn(() => vi.fn())}});
afterEach(cleanup);
describe('sandbox bridge', () => {
  it('permits only granted commands with validated payloads', () => {
    const ctx = context();
    expect(handlePanelRequest(ctx,['commands.session.new'],'command',{id:'session.new',payload:null})).toBe(true);
    for (const [permissions,payload] of [[[],{id:'session.new'}],[['commands.session.new'],{id:'desktop.exec',payload:'rm'}],[['commands.session.new'],{id:'session.new',payload:{injected:true}}]] as const) expect(() => handlePanelRequest(ctx,permissions,'command',payload)).toThrow();
    expect(ctx.commands.execute).toHaveBeenCalledTimes(1);
    expect(() => handlePanelRequest(ctx,[],'setState',{content:'x'.repeat(40_000)})).toThrow();
    expect(ctx.setState).not.toHaveBeenCalled();
  });
  it('checks sender, channel and readiness, then releases subscriptions on unmount', () => {
    const ctx=context(), unsubscribe=vi.fn(); vi.mocked(ctx.events.subscribe).mockReturnValue(unsubscribe);
    const rendered=render(<SandboxPanel context={ctx} html="<p>Counter</p>" permissions={['events.workspace.changed']} title="Counter"/>);
    const frame=rendered.getByTitle('Counter') as HTMLIFrameElement;
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    const channel=new URL(frame.src).hash.slice(1);
    const send=(data:unknown,source:Window|null=frame.contentWindow) => act(() => { window.dispatchEvent(new MessageEvent('message',{data,source})); });
    const message={protocol:1,channel,id:'1',type:'setState',payload:{count:2}};
    send(message,window); send({...message,channel:'wrong'}); send(message);
    expect(ctx.setState).not.toHaveBeenCalled();
    send({...message,type:'ready',payload:null});
    send(message);
    expect(ctx.setState).toHaveBeenCalledWith({count:2});
    expect(ctx.events.subscribe).toHaveBeenCalledTimes(1);
    rendered.unmount(); expect(unsubscribe).toHaveBeenCalledTimes(1);
    send(message); expect(ctx.setState).toHaveBeenCalledTimes(1);
  });
});
