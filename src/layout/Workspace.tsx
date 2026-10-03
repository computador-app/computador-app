import { useEffect, useRef } from "react";
import {
  DockviewReact,
  themeDark,
  themeLight,
  type DockviewApi,
  type SerializedDockview,
  type DockviewReadyEvent,
} from "dockview-react";
import "dockview/dist/styles/dockview.css";
import { PanelLeft } from "lucide-react";
import { panels } from "./registry";
import { RegisteredPanel, PanelRuntimeContext } from "./PanelFrame";
import type { CommandRegistry } from "./commands";
import { panelTitle } from "../panels-sdk/types";
import { cloneState, PANEL_ID } from "../panels-sdk/validation";
import { useI18n, messages, type Locale } from "../i18n";
import {
  layoutKey,
  savedLayoutKey,
  readStorage,
  writeStorage,
} from "./preferences";
export type Preset = "default" | "focus" | "review";
export interface WorkspaceController {
  open(type: string): void;
  preset(preset: Preset): void;
  save(): boolean;
  restore(): boolean;
}
const components = { registered: RegisteredPanel };
function EmptyWorkspace({ containerApi }: { containerApi: DockviewApi }) {
  const { t, locale } = useI18n();
  return (
    <div className="empty-workspace">
      <PanelLeft size={36} />
      <h2>{t("empty")}</h2>
      <p>{t("emptyHint")}</p>
      <button onClick={() => applyPreset(containerApi, "default", locale)}>
        {t("reset")}
      </button>
    </div>
  );
}
function add(
  api: DockviewApi,
  type: string,
  locale: Locale,
  reference?: string,
  direction?: "left" | "right" | "above" | "below" | "within",
) {
  const definition = panels.get(type);
  if (!definition) return;
  const id = definition.multiple
    ? `panel-${type}-${crypto.randomUUID()}`
    : type === "chat"
      ? "main-chat"
      : `panel-${type}`;
  const existing = api.getPanel(id);
  if (existing) {
    existing.api.setActive();
    return existing;
  }
  if (api.panels.length >= 64) return;
  return api.addPanel({
    id,
    component: "registered",
    params: {
      type,
      uiState: cloneState(definition.defaultState || {}),
      stateVersion: definition.stateVersion || 1,
    },
    title: panelTitle(definition.title, locale),
    minimumWidth: type === "chat" ? 300 : 180,
    minimumHeight: 120,
    ...(reference && api.getPanel(reference)
      ? {
          position: {
            referencePanel: reference,
            direction: direction || definition.location,
          },
        }
      : {}),
  });
}
export function applyPreset(api: DockviewApi, preset: Preset, locale: Locale) {
  api.clear();
  add(api, "chat", locale);
  if (preset === "focus") return;
  const files = add(api, "files", locale, "main-chat", "left");
  add(api, "sessions", locale, "panel-files", "below");
  const preview = add(
    api,
    preset === "review" ? "viewer" : "markdown",
    locale,
    "main-chat",
    "right",
  );
  if (preset === "review") {
    add(api, "markdown", locale, "panel-viewer", "within");
    add(api, "activity", locale, "main-chat", "below")?.api.setSize({
      height: 190,
    });
  }
  files?.api.setSize({ width: 230 });
  preview?.api.setSize({ width: 310 });
  api.getPanel("main-chat")?.api.setActive();
}
function readLayout(key: string): SerializedDockview | undefined {
  const raw = readStorage(key);
  if (!raw) return;
  if (raw.length > 5_000_000) throw new Error("Layout too large");
  const value = JSON.parse(raw);
  if (
    value.version !== 1 ||
    !value.dock?.grid ||
    !value.dock?.panels ||
    Object.keys(value.dock.panels).length > 64
  )
    throw new Error("Invalid layout");
  for (const panel of Object.values(value.dock.panels) as {
    contentComponent: string;
    params?: { type?: string; uiState?: unknown; stateVersion?: number };
  }[])
    if (
      panel.contentComponent !== "registered" ||
      !PANEL_ID.test(panel.params?.type || "")
    )
      throw new Error("Unknown panel");
  if (value.dock.popoutGroups?.length) throw new Error("Unsupported windows");
  return value.dock;
}
export function Workspace({
  theme,
  commands,
  controller,
  onNotice,
}: {
  theme: "dark" | "light";
  commands: CommandRegistry;
  controller: React.RefObject<WorkspaceController | null>;
  onNotice: (message: string) => void;
}) {
  const { locale, t } = useI18n();
  const apiRef = useRef<DockviewApi | null>(null);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const noticeRef = useRef(onNotice);
  noticeRef.current = onNotice;
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);
  useEffect(() => {
    for (const panel of apiRef.current?.panels || []) {
      const definition = panels.get(panel.params?.type);
      if (definition) panel.api.setTitle(panelTitle(definition.title, locale));
    }
  }, [locale]);
  useEffect(
    () =>
      panels.subscribe(() => {
        for (const panel of apiRef.current?.panels || []) {
          const def = panels.get(panel.params?.type);
          if (def) panel.api.setTitle(panelTitle(def.title, localeRef.current));
        }
      }),
    [],
  );
  const ready = ({ api }: DockviewReadyEvent) => {
    cleanup.current();
    apiRef.current = api;
    const reset = () => applyPreset(api, "default", localeRef.current);
    try {
      const saved = readLayout(layoutKey);
      if (saved) api.fromJSON(saved);
      else reset();
    } catch {
      reset();
      noticeRef.current(messages[localeRef.current].invalidLayout);
    }
    const persist = () => {
      if (!writeStorage(layoutKey, { version: 1, dock: api.toJSON() }))
        noticeRef.current(messages[localeRef.current].storageError);
    };
    const subscription = api.onDidLayoutChange(persist);
    window.addEventListener("beforeunload", persist);
    cleanup.current = () => {
      subscription.dispose();
      window.removeEventListener("beforeunload", persist);
    };
    controller.current = {
      open(type) {
        if (!add(api, type, localeRef.current, "main-chat"))
          noticeRef.current(messages[localeRef.current].panelLimit);
      },
      preset(preset) {
        applyPreset(api, preset, localeRef.current);
        persist();
      },
      save() {
        return writeStorage(savedLayoutKey, { version: 1, dock: api.toJSON() });
      },
      restore() {
        try {
          const saved = readLayout(savedLayoutKey);
          if (!saved) return false;
          api.fromJSON(saved);
          for (const panel of api.panels) {
            const definition = panels.get(panel.params?.type);
            if (definition)
              panel.api.setTitle(
                panelTitle(definition.title, localeRef.current),
              );
          }
          persist();
          return true;
        } catch {
          reset();
          noticeRef.current(messages[localeRef.current].invalidLayout);
          return false;
        }
      },
    };
  };
  return (
    <PanelRuntimeContext.Provider value={{ theme, commands }}>
      <DockviewReact
        className="workspace-dock"
        components={components}
        onReady={ready}
        theme={theme === "dark" ? themeDark : themeLight}
        watermarkComponent={EmptyWorkspace}
      />
    </PanelRuntimeContext.Provider>
  );
}
