import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Command,
  Files,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sun,
  TerminalSquare,
  FileText,
  Code2,
} from "lucide-react";
import appIcon from "../assets/computador-icon-ui.png";
import { DomainProvider, useDomain } from "./domain/context";
import { I18nContext, useI18n } from "./i18n";
import { CommandRegistry } from "./layout/commands";
import { Workspace, type WorkspaceController } from "./layout/Workspace";
import { panels } from "./layout/registry";
import {
  parsePreferences,
  preferenceKey,
  readStorage,
  writeStorage,
  type Preferences,
} from "./layout/preferences";
import { Settings } from "./ui/Settings";
import { Modal } from "./ui/Modal";
import "./panels/panels.css";
interface Item {
  id: string;
  label: string;
  shortcut?: string;
}
function Menu({
  label,
  items,
  execute,
}: {
  label: string;
  items: Item[];
  execute: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="menu"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          ref.current?.querySelector("button")?.focus();
        }
        if (["ArrowDown", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => {
            const entries = Array.from(
              ref.current?.querySelectorAll<HTMLButtonElement>(
                "[role=menuitem]",
              ) || [],
            );
            const i = entries.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            entries[
              (i + (e.key === "ArrowDown" ? 1 : -1) + entries.length) %
                entries.length
            ]?.focus();
          });
        }
      }}
    >
      <button
        className={open ? "menu-trigger active" : "menu-trigger"}
        aria-expanded={open}
        aria-haspopup="menu"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div className="menu-popup" role="menu" aria-label={label}>
          {items.map((item) => (
            <button
              role="menuitem"
              key={item.id}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                execute(item.id);
                setOpen(false);
              }}
            >
              <span>{item.label}</span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
const icons = {
  sessions: MessageSquare,
  files: Files,
  chat: MessageSquare,
  viewer: Code2,
  markdown: FileText,
  terminal: TerminalSquare,
};
function Shell({
  preferences,
  setPreferences,
  commands,
}: {
  preferences: Preferences;
  setPreferences: (p: Preferences) => void;
  commands: CommandRegistry;
}) {
  const { t, locale } = useI18n();
  const domain = useDomain();
  const controller = useRef<WorkspaceController | null>(null);
  const [modal, setModal] = useState<
    "settings" | "workspace" | "about" | "commands" | null
  >(null);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<
    "demo" | "research"
  >("demo");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const commandItems: Item[] = [
    { id: "workspace.open", label: t("openFolder"), shortcut: "Ctrl O" },
    { id: "session.new", label: t("newSession"), shortcut: "Ctrl N" },
    { id: "preferences.open", label: t("preferences"), shortcut: "Ctrl ," },
    ...panels.list().map((p) => ({
      id: `panel.${p.id}`,
      label: `${t("view")} · ${t(p.title)}`,
    })),
    ...(["default", "focus", "review"] as const).map((p) => ({
      id: `layout.${p}`,
      label: `${t("layouts")} · ${t(p)}`,
    })),
    { id: "layout.save", label: t("saveLayout") },
    { id: "layout.restore", label: t("restoreLayout") },
  ];
  useEffect(() => {
    const handlers: Record<string, (payload?: unknown) => void> = {
      "workspace.open": () => {
        if (domain.service.backend) domain.openWorkspace("");
        else setModal("workspace");
      },
      "workspace.recent": (id) => domain.openWorkspace(String(id)),
      "workspace.recent.demo": () => domain.openWorkspace("demo"),
      "workspace.recent.research": () => domain.openWorkspace("research"),
      "preferences.open": () => setModal("settings"),
      "help.about": () => setModal("about"),
      "commands.open": () => {
        setQuery("");
        setModal("commands");
      },
      "session.open": () => controller.current?.open("chat"),
      "session.new": () => {
        domain.newSession();
        controller.current?.open("chat");
        controller.current?.open("sessions");
      },
      "file.open": () => {
        controller.current?.open("viewer");
        controller.current?.open("markdown");
      },
      "layout.save": () =>
        setNotice(t(controller.current?.save() ? "saved" : "storageError")),
      "layout.restore": () =>
        setNotice(t(controller.current?.restore() ? "restored" : "noSaved")),
    };
    for (const p of ["default", "focus", "review"] as const)
      handlers[`layout.${p}`] = () => controller.current?.preset(p);
    for (const p of panels.list())
      handlers[`panel.${p.id}`] = () => controller.current?.open(p.id);
    const disposers = Object.entries(handlers).map(([id, handler]) =>
      commands.register(id, handler),
    );
    const unsubscribe = window.desktop?.onCommand((id) => {
      if (id.startsWith("workspace.recent:"))
        domain.openWorkspace(id.slice("workspace.recent:".length));
      else commands.execute(id);
    });
    return () => {
      disposers.forEach((dispose) => dispose());
      unsubscribe?.();
    };
  }, [commands, domain, locale]);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const id =
        e.key === ","
          ? "preferences.open"
          : e.key.toLowerCase() === "o"
            ? "workspace.open"
            : e.key.toLowerCase() === "n"
              ? "session.new"
              : e.shiftKey && e.key.toLowerCase() === "p"
                ? "commands.open"
                : undefined;
      if (id) {
        e.preventDefault();
        commands.execute(id);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [commands]);
  const execute = (id: string) => {
    commands.execute(id);
  };
  const edit = async (id: string) => {
    const action = id as
      "undo" | "redo" | "cut" | "copy" | "paste" | "selectAll";
    if (window.desktop) {
      window.desktop.edit(action);
      return;
    }
    try {
      if (action === "paste") {
        const text = await navigator.clipboard.readText();
        if (!document.execCommand("insertText", false, text))
          setNotice(t("editHint"));
      } else if (!document.execCommand(action)) setNotice(t("editHint"));
    } catch {
      setNotice(t("editHint"));
    }
  };
  const editItems: Item[] = (
    [
      ["undo", "Ctrl Z"],
      ["redo", "Ctrl Shift Z"],
      ["cut", "Ctrl X"],
      ["copy", "Ctrl C"],
      ["paste", "Ctrl V"],
      ["selectAll", "Ctrl A"],
    ] as const
  ).map(([key, shortcut]) => ({ id: key, label: t(key), shortcut }));
  return (
    <div className="app-shell">
      <header className="titlebar">
        <div className="brand">
          <img className="brand-icon" src={appIcon} alt="" aria-hidden="true" />
          <strong>Computador</strong>
          <span className="breadcrumb">/</span>
          <button onClick={() => execute("workspace.open")}>
            {domain.state.workspace.name}
            <ChevronDown size={12} />
          </button>
        </div>
        <button
          className="command-search"
          onClick={() => execute("commands.open")}
        >
          <Search size={13} />
          <span>{t("command")}</span>
          <kbd>Ctrl ⇧ P</kbd>
        </button>
        <span className="preview-label">
          {domain.service.backend ? "COMPUTADOR" : "PREVIEW"} <span>0.2</span>
        </span>
      </header>
      {!window.desktop && (
        <nav className="menubar" aria-label="Menu">
          <Menu
            label={t("file")}
            execute={execute}
            items={[
              commandItems[0],
              commandItems[1],
              {
                id: "workspace.recent.demo",
                label: `${t("recent")} · core-api`,
              },
              {
                id: "workspace.recent.research",
                label: `${t("recent")} · research-lab`,
              },
              commandItems[2],
            ]}
          />
          <Menu label={t("edit")} items={editItems} execute={edit} />
          <Menu
            label={t("view")}
            execute={execute}
            items={panels
              .list()
              .map((p) => ({ id: `panel.${p.id}`, label: t(p.title) }))}
          />
          <Menu
            label={t("layouts")}
            execute={execute}
            items={[
              ...(["default", "focus", "review"] as const).map((p) => ({
                id: `layout.${p}`,
                label: t(p),
              })),
              { id: "layout.save", label: t("saveLayout") },
              { id: "layout.restore", label: t("restoreLayout") },
            ]}
          />
          <Menu
            label={t("help")}
            execute={execute}
            items={[
              { id: "help.about", label: t("about") },
              { id: "commands.open", label: t("search") },
            ]}
          />
          <span className="menubar-tip">{t("tip")}</span>
        </nav>
      )}
      <main className="workbench">
        <aside className="activity-rail" aria-label={t("view")}>
          {panels
            .list()
            .filter((p) => p.id !== "chat")
            .map((p) => {
              const Icon = icons[p.id as keyof typeof icons] || LayoutGrid;
              return (
                <button
                  key={p.id}
                  className="rail-button"
                  aria-label={`${t("open")} ${t(p.title)}`}
                  title={t(p.title)}
                  onClick={() => execute(`panel.${p.id}`)}
                >
                  <Icon size={19} />
                </button>
              );
            })}
          <div className="rail-spacer" />
          <button
            className="rail-button"
            title={t("newSession")}
            aria-label={t("newSession")}
            onClick={() => execute("session.new")}
          >
            <Plus size={19} />
          </button>
          <button
            className="rail-button"
            title={t("preferences")}
            aria-label={t("preferences")}
            onClick={() => execute("preferences.open")}
          >
            <SettingsIcon size={19} />
          </button>
        </aside>
        <div className="workspace-region">
          <Workspace
            theme={preferences.theme}
            controller={controller}
            onNotice={setNotice}
          />
        </div>
      </main>
      <footer className="statusbar">
        <div>
          {!domain.service.backend && (
            <>
              <GitBranch size={12} />
              <span>main</span>
              <span className="status-separator">/</span>
            </>
          )}
          <FolderOpen size={12} />
          <span>{domain.state.workspace.name}</span>
        </div>
        <div>
          <span className="status-dot" />
          <span>
            {domain.service.backend
              ? locale === "en"
                ? "Local runtime"
                : "Runtime local"
              : t("mock")}
          </span>
          <span className="status-separator">·</span>
          <button onClick={() => execute("preferences.open")}>
            {locale === "en" ? "EN" : "PT-BR"}
          </button>
          <button
            className="icon-button"
            aria-label={t("theme")}
            onClick={() =>
              setPreferences({
                ...preferences,
                theme: preferences.theme === "dark" ? "light" : "dark",
              })
            }
          >
            {preferences.theme === "dark" ? (
              <Moon size={13} />
            ) : (
              <Sun size={13} />
            )}
          </button>
        </div>
      </footer>
      {domain.state.error && (
        <div className="toast" role="alert">
          {domain.state.error}
          <button
            onClick={() => domain.service.clearError?.()}
            aria-label={locale === "en" ? "Close" : "Fechar"}
          >
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {modal === "settings" && (
        <Settings
          locale={locale}
          theme={preferences.theme}
          fontSize={preferences.fontSize}
          onLocaleChange={(value) =>
            setPreferences({ ...preferences, locale: value })
          }
          onThemeChange={(value) =>
            setPreferences({ ...preferences, theme: value })
          }
          onFontSizeChange={(value) =>
            setPreferences({ ...preferences, fontSize: value })
          }
          onClose={() => setModal(null)}
        />
      )}
      {modal === "workspace" && (
        <Modal title={t("chooseFolder")} onClose={() => setModal(null)}>
          <p className="muted">{t("chooseHint")}</p>
          <div className="workspace-options">
            {(["demo", "research"] as const).map((id) => (
              <button
                key={id}
                className={
                  selectedWorkspace === id
                    ? "workspace-option selected"
                    : "workspace-option"
                }
                aria-pressed={selectedWorkspace === id}
                onClick={() => setSelectedWorkspace(id)}
              >
                <FolderOpen size={23} />
                <span>
                  <strong>{id === "demo" ? "core-api" : "research-lab"}</strong>
                  <small>
                    {id === "demo"
                      ? "PHP · Laravel · Pricing Engine"
                      : "Markdown · Research · Notes"}
                  </small>
                </span>
                {selectedWorkspace === id && (
                  <span className="selected-mark">✓</span>
                )}
              </button>
            ))}
          </div>
          <footer className="dialog-actions">
            <button onClick={() => setModal(null)}>{t("cancel")}</button>
            <button
              className="primary"
              onClick={() => {
                domain.openWorkspace(selectedWorkspace);
                controller.current?.open("files");
                setModal(null);
              }}
            >
              {t("open")}
            </button>
          </footer>
        </Modal>
      )}
      {modal === "about" && (
        <Modal title={t("about")} onClose={() => setModal(null)}>
          <img
            className="brand-icon large"
            src={appIcon}
            alt=""
            aria-hidden="true"
          />
          <p>
            {domain.service.backend
              ? locale === "en"
                ? "Project assistant with providers, persistent chats and local tools."
                : "Assistente de projetos com provedores, chats persistentes e ferramentas locais."
              : t("aboutText")}
          </p>
          <p className="muted">{t("local")}. v0.2.0</p>
        </Modal>
      )}
      {modal === "commands" && (
        <Modal
          title={t("search")}
          onClose={() => setModal(null)}
          className="command-dialog"
        >
          <input
            autoFocus
            aria-label={t("search")}
            placeholder={t("command")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="command-results">
            {commandItems
              .filter((item) =>
                item.label
                  .toLocaleLowerCase()
                  .includes(query.toLocaleLowerCase()),
              )
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setModal(null);
                    execute(item.id);
                  }}
                >
                  <Command size={14} />
                  <span>{item.label}</span>
                  <kbd>{item.shortcut}</kbd>
                </button>
              ))}
            {!commandItems.some((item) =>
              item.label.toLowerCase().includes(query.toLowerCase()),
            ) && <p className="muted">{t("noCommands")}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
export default function App() {
  const [preferences, setPreferences] = useState<Preferences>(() =>
    parsePreferences(readStorage(preferenceKey)),
  );
  const commands = useMemo(() => new CommandRegistry(), []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.lang = preferences.locale;
    document.documentElement.style.fontSize = `${preferences.fontSize}px`;
    window.desktop?.setLocale(preferences.locale);
    writeStorage(preferenceKey, preferences);
  }, [preferences]);
  return (
    <I18nContext.Provider value={preferences.locale}>
      <DomainProvider
        locale={preferences.locale}
        onCommand={(id, payload) => commands.execute(id, payload)}
      >
        <Shell
          preferences={preferences}
          setPreferences={setPreferences}
          commands={commands}
        />
      </DomainProvider>
    </I18nContext.Provider>
  );
}
