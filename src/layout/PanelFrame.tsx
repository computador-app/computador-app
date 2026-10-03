import {
  Component,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { Maximize2, CopyPlus } from "lucide-react";
import { panels } from "./registry";
import { useI18n } from "../i18n";
import {
  panelTitle,
  type PanelContext,
  type PanelDefinition,
  type PanelState,
} from "../panels-sdk/types";
import { cloneState } from "../panels-sdk/validation";
import { PanelScope, panelEvents } from "../panels-sdk/events";
import type { CommandRegistry } from "./commands";
export const PanelRuntimeContext = createContext<{
  theme: "dark" | "light";
  commands: CommandRegistry;
} | null>(null);
export function restorePanelState(
  definition: PanelDefinition,
  params: { uiState?: unknown; stateVersion?: number },
) {
  const version = definition.stateVersion || 1;
  let state = cloneState(params.uiState ?? definition.defaultState ?? {});
  const savedVersion = params.stateVersion ?? 1;
  if (!Number.isInteger(savedVersion) || savedVersion < 1)
    throw new Error("Invalid saved state version");
  if (savedVersion > version) throw new Error("Newer panel state version");
  if (savedVersion < version) {
    if (!definition.migrateState)
      throw new Error("Missing panel state migration");
    state = cloneState(definition.migrateState(state, savedVersion));
  }
  return state;
}
class PanelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; resetKey: unknown },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(
    previous: Readonly<{
      children: ReactNode;
      fallback: ReactNode;
      resetKey: unknown;
    }>,
  ) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed)
      this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function RegisteredPanel({
  params,
  api,
  containerApi,
}: IDockviewPanelProps<{
  type: string;
  uiState?: PanelState;
  stateVersion?: number;
}>) {
  const { locale, t } = useI18n();
  const runtime = useContext(PanelRuntimeContext)!;
  useSyncExternalStore(panels.subscribe, panels.list);
  const definition = panels.get(params.type);
  const [retry, setRetry] = useState(0);
  const scope = useMemo(() => new PanelScope(), [api.id, definition, retry]);
  useLayoutEffect(() => {
    scope.activate();
    return () => scope.dispose();
  }, [scope]);
  const title = definition ? panelTitle(definition.title, locale) : params.type;
  const error = (
    <div className="panel-placeholder" role="alert">
      <h3>{t("panelFailed")}</h3>
      <p>{t("panelFailedHint")}</p>
      <button
        onClick={() => {
          api.updateParameters({
            uiState: cloneState(definition?.defaultState || {}),
            stateVersion: definition?.stateVersion || 1,
          });
          setRetry((v) => v + 1);
        }}
      >
        {t("resetPanel")}
      </button>
    </div>
  );
  let state: PanelState = {};
  let invalidState = false;
  if (definition) {
    try {
      state = restorePanelState(definition, params);
    } catch {
      invalidState = true;
    }
  }
  useEffect(() => {
    if (
      definition &&
      !invalidState &&
      params.stateVersion !== (definition.stateVersion || 1)
    ) {
      api.updateParameters({
        uiState: state,
        stateVersion: definition.stateVersion || 1,
      });
    }
  }, [api, definition, invalidState, params.stateVersion]);
  const context: PanelContext = {
    instanceId: api.id,
    panelType: params.type,
    locale,
    theme: runtime.theme,
    state,
    setState(next) {
      if (scope.active)
        api.updateParameters({
          uiState: cloneState(next),
          stateVersion: definition?.stateVersion || 1,
        });
    },
    commands: {
      execute(id, payload) {
        return scope.active && runtime.commands.execute(id, payload);
      },
    },
    events: {
      subscribe(event, handler) {
        return scope.track(panelEvents.subscribe(event, handler));
      },
    },
    lifecycle: {
      onDispose(callback) {
        return scope.track(callback);
      },
    },
  };
  const move = (position: string) => {
    if (position === "center" && !containerApi.getPanel("main-chat"))
      runtime.commands.execute("panel.chat");
    const chat = containerApi.getPanel("main-chat");
    const target =
      chat && chat.id !== api.id
        ? chat.group
        : containerApi.groups.find((group) => group !== api.group);
    if (!target && (position === "center" || api.group.panels.length === 1))
      return;
    const edge =
      ({ above: "top", below: "bottom" } as const)[
        position as "above" | "below"
      ] || (position as "left" | "right" | "center");
    api.moveTo({ group: target || api.group, position: edge });
  };
  const Content = definition?.component;
  return (
    <section
      className={`registered-panel panel-${params.type}`}
      aria-label={title}
      data-panel-instance={api.id}
    >
      <div className="panel-tools">
        <span>{title}</span>
        <div>
          {definition?.multiple && (
            <button
              className="icon-button"
              aria-label={`${t("newPanelInstance")} ${title}`}
              title={t("newPanelInstance")}
              onClick={() => runtime.commands.execute(`panel.${params.type}`)}
            >
              <CopyPlus size={12} />
            </button>
          )}
          <select
            aria-label={t("movePanel")}
            value=""
            onChange={(e) => move(e.target.value)}
          >
            <option value="" disabled>
              ↔ {t("movePanel")}
            </option>
            {(["left", "right", "above", "below", "center"] as const).map(
              (p) => (
                <option key={p} value={p}>
                  {t(p)}
                </option>
              ),
            )}
          </select>
          <button
            className="icon-button"
            title={t("focus")}
            aria-label={`${t("focus")} ${title}`}
            onClick={() =>
              api.isMaximized() ? api.exitMaximized() : api.maximize()
            }
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
      <div className="panel-body">
        {!definition ? (
          <div className="panel-placeholder">
            <h3>{t("panelUnavailable")}</h3>
            <code>{params.type}</code>
            <p>{t("panelUnavailableHint")}</p>
            <button onClick={() => runtime.commands.execute("extensions.open")}>
              {t("extensions")}
            </button>
          </div>
        ) : invalidState ? (
          error
        ) : (
          <PanelErrorBoundary
            resetKey={`${retry}:${definition.owner || "core"}`}
            fallback={error}
          >
            {Content && <Content key={retry} context={context} />}
          </PanelErrorBoundary>
        )}
      </div>
    </section>
  );
}
