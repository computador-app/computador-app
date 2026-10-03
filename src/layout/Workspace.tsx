import { useEffect, useRef } from "react";
import {
  DockviewReact,
  themeDark,
  themeLight,
  type DockviewApi,
  type IDockviewPanelProps,
  type SerializedDockview,
  type DockviewReadyEvent,
} from "dockview-react";
import "dockview/dist/styles/dockview.css";
import { Maximize2, PanelLeft } from "lucide-react";
import { panels } from "./registry";
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
function RegisteredPanel({
  params,
  api,
  containerApi,
}: IDockviewPanelProps<{ type: string }>) {
  const { t, locale } = useI18n();
  const definition = panels.get(params.type);
  if (!definition) return null;
  const Component = definition.component;
  const move = (position: string) => {
    const chat =
      containerApi.getPanel("main-chat") ||
      (position === "center" ? add(containerApi, "chat", locale) : undefined);
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
  return (
    <section
      className={`registered-panel panel-${params.type}`}
      aria-label={t(definition.title)}
    >
      <div className="panel-tools">
        <span>{t(definition.title)}</span>
        <div>
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
            aria-label={`${t("focus")} ${t(definition.title)}`}
            onClick={() =>
              api.isMaximized() ? api.exitMaximized() : api.maximize()
            }
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
      <div className="panel-body">
        <Component />
      </div>
    </section>
  );
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
  const id = type === "chat" ? "main-chat" : `panel-${type}`;
  const existing = api.getPanel(id);
  if (existing) {
    existing.api.setActive();
    return existing;
  }
  return api.addPanel({
    id,
    component: "registered",
    params: { type },
    title: messages[locale][definition.title],
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
  }
  files?.api.setSize({ width: 230 });
  preview?.api.setSize({ width: 310 });
  api.getPanel("main-chat")?.api.setActive();
}
const removedPanelTypes = new Set(["agents", "activity"]);
function restorePanels(api: DockviewApi, layout: SerializedDockview) {
  api.fromJSON(layout);
  // Let Dockview repair groups and geometry when removing retired panel instances.
  for (const panel of [...api.panels]) {
    if (removedPanelTypes.has(panel.params?.type)) api.removePanel(panel);
  }
}
function readLayout(key: string): SerializedDockview | undefined {
  const raw = readStorage(key);
  if (!raw) return;
  const value = JSON.parse(raw);
  if (
    value.version !== 1 ||
    !value.dock?.grid ||
    !value.dock?.panels ||
    Object.keys(value.dock.panels).length > 40
  )
    throw new Error("Invalid layout");
  for (const panel of Object.values(value.dock.panels) as {
    contentComponent: string;
    params?: { type?: string };
  }[])
    if (
      panel.contentComponent !== "registered" ||
      (!panels.get(panel.params?.type || "") &&
        !removedPanelTypes.has(panel.params?.type || ""))
    )
      throw new Error("Unknown panel");
  if (value.dock.popoutGroups?.length) throw new Error("Unsupported windows");
  return value.dock;
}
export function Workspace({
  theme,
  controller,
  onNotice,
}: {
  theme: "dark" | "light";
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
      if (definition) panel.api.setTitle(t(definition.title));
    }
  }, [locale]);
  const ready = ({ api }: DockviewReadyEvent) => {
    cleanup.current();
    apiRef.current = api;
    const reset = () => applyPreset(api, "default", localeRef.current);
    try {
      const saved = readLayout(layoutKey);
      if (saved) restorePanels(api, saved);
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
        add(api, type, localeRef.current, "main-chat");
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
          restorePanels(api, saved);
          for (const panel of api.panels) {
            const definition = panels.get(panel.params?.type);
            if (definition)
              panel.api.setTitle(messages[localeRef.current][definition.title]);
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
    <DockviewReact
      className="workspace-dock"
      components={components}
      onReady={ready}
      theme={theme === "dark" ? themeDark : themeLight}
      watermarkComponent={EmptyWorkspace}
    />
  );
}
