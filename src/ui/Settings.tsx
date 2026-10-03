import { ProviderSettings } from "./ProviderSettings";
import { useDomain } from "../domain/context";
import { useEffect, useRef, useState } from "react";
import "./settings.css";

export interface SettingsProps {
  locale: "pt-BR" | "en";
  theme: "dark" | "light";
  fontSize: number;
  onLocaleChange: (locale: "pt-BR" | "en") => void;
  onThemeChange: (theme: "dark" | "light") => void;
  onFontSizeChange: (size: number) => void;
  onClose: () => void;
}

const tabNames = {
  "pt-BR": ["Geral", "Aparência", "Provedores", "Modelo", "Agentes", "Atalhos"],
  en: ["General", "Appearance", "Providers", "Model", "Agents", "Shortcuts"],
};

export function Settings({
  locale,
  theme,
  fontSize,
  onLocaleChange,
  onThemeChange,
  onFontSizeChange,
  onClose,
}: SettingsProps) {
  const { service } = useDomain();
  const real = !!service.backend;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const pt = locale === "pt-BR";
  const labels = tabNames[locale];

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    return () => {
      previousFocus?.focus();
    };
  }, []);

  const chooseTab = (index: number) => {
    setActiveTab(index);
    tabRefs.current[index]?.focus();
  };

  return (
    <dialog
      ref={dialogRef}
      className="settings-dialog"
      aria-labelledby="settings-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="settings-content">
        <header className="settings-header">
          <div>
            <span className="settings-eyebrow">COMPUTADOR</span>
            <h2 id="settings-title">{pt ? "Configurações" : "Settings"}</h2>
          </div>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label={pt ? "Fechar configurações" : "Close settings"}
          >
            ×
          </button>
        </header>
        <div className="settings-body">
          <nav
            className="settings-tabs"
            role="tablist"
            aria-label={pt ? "Seções de configurações" : "Settings sections"}
            aria-orientation="vertical"
          >
            {labels.map((name, index) => (
              <button
                type="button"
                key={index}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                id={`settings-tab-${index}`}
                role="tab"
                aria-selected={activeTab === index}
                aria-controls={`settings-panel-${index}`}
                tabIndex={activeTab === index ? 0 : -1}
                onClick={() => setActiveTab(index)}
                onKeyDown={(event) => {
                  let next = index;
                  if (event.key === "ArrowDown" || event.key === "ArrowRight")
                    next = (index + 1) % labels.length;
                  else if (event.key === "ArrowUp" || event.key === "ArrowLeft")
                    next = (index + labels.length - 1) % labels.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = labels.length - 1;
                  else return;
                  event.preventDefault();
                  chooseTab(next);
                }}
              >
                {name}
              </button>
            ))}
          </nav>
          <section
            className="settings-panel"
            role="tabpanel"
            id={`settings-panel-${activeTab}`}
            aria-labelledby={`settings-tab-${activeTab}`}
            tabIndex={0}
          >
            <h3>{labels[activeTab]}</h3>
            {activeTab === 0 && (
              <>
                <p className="settings-description">
                  {pt
                    ? "Um espaço de trabalho do seu jeito."
                    : "A workspace that feels like yours."}
                </p>
                <label className="settings-field">
                  <span>
                    {pt ? "Idioma da interface" : "Interface language"}
                  </span>
                  <select
                    value={locale}
                    onChange={(event) =>
                      onLocaleChange(
                        event.target.value as SettingsProps["locale"],
                      )
                    }
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <div className="settings-note">
                  <strong>
                    {real
                      ? pt
                        ? "Aplicativo local"
                        : "Local application"
                      : pt
                        ? "Prévia do aplicativo"
                        : "Application preview"}
                  </strong>
                  <p>
                    {real
                      ? pt
                        ? "Conversas por pasta, modelos e preferências são salvos neste dispositivo."
                        : "Folder conversations, models and preferences are saved on this device."
                      : pt
                        ? "Demonstração em memória no navegador."
                        : "In-memory browser demonstration."}
                  </p>
                </div>
                <p className="settings-description">
                  {real
                    ? pt
                      ? "Mensagens e resultados de ferramentas são enviados ao provedor escolhido."
                      : "Messages and tool results are sent to the selected provider."
                    : pt
                      ? "Nenhuma mensagem ou arquivo é enviado a serviços externos."
                      : "No messages or files are sent to external services."}
                </p>
              </>
            )}
            {activeTab === 1 && (
              <>
                <p className="settings-description">
                  {pt
                    ? "Ajuste o conforto visual do seu ambiente."
                    : "Make your environment comfortable to use."}
                </p>
                <fieldset className="settings-themes">
                  <legend>{pt ? "Tema" : "Theme"}</legend>
                  {(["dark", "light"] as const).map((value) => (
                    <label
                      className={`settings-theme settings-theme-${value}`}
                      key={value}
                    >
                      <span
                        className="settings-theme-preview"
                        aria-hidden="true"
                      >
                        <i />
                        <i />
                        <i />
                      </span>
                      <span>
                        <input
                          type="radio"
                          name="settings-theme"
                          value={value}
                          checked={theme === value}
                          onChange={() => onThemeChange(value)}
                        />
                        {value === "dark"
                          ? pt
                            ? "Escuro"
                            : "Dark"
                          : pt
                            ? "Claro"
                            : "Light"}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <label className="settings-field" htmlFor="settings-font">
                  <span>
                    {pt ? "Tamanho do texto" : "Text size"}{" "}
                    <output>{fontSize} px</output>
                  </span>
                  <input
                    id="settings-font"
                    type="range"
                    min="12"
                    max="18"
                    step="1"
                    value={fontSize}
                    onChange={(event) =>
                      onFontSizeChange(Number(event.target.value))
                    }
                  />
                </label>
                <div className="settings-type-preview" style={{ fontSize }}>
                  {pt
                    ? "Suas ideias merecem espaço."
                    : "Give your ideas room to grow."}
                </div>
              </>
            )}
            {activeTab === 2 && <ProviderSettings tab="providers" />}
            {activeTab === 3 && <ProviderSettings tab="models" />}
            {activeTab === 4 && (
              <p className="settings-description">
                {pt
                  ? "Um agente geral com leitura, escrita e shell, sem pedidos de permissão. Perfis editáveis e delegação estarão disponíveis em uma fase futura."
                  : "One general agent with file reading, writing and shell, without approval prompts. Editable profiles and delegation are planned for a future phase."}
              </p>
            )}
            {activeTab === 5 && (
              <>
                <p className="settings-description">
                  {pt
                    ? "Menos cliques, mais fluidez."
                    : "Fewer clicks, a smoother workflow."}
                </p>
                <dl className="settings-shortcuts">
                  {[
                    [pt ? "Abrir pasta" : "Open folder", "Ctrl + O"],
                    [pt ? "Nova conversa" : "New conversation", "Ctrl + N"],
                    [pt ? "Abrir configurações" : "Open settings", "Ctrl + ,"],
                    [
                      pt ? "Paleta de comandos" : "Command palette",
                      "Ctrl + Shift + P",
                    ],
                    [pt ? "Fechar diálogo" : "Close dialog", "Esc"],
                  ].map(([label, shortcut]) => (
                    <div key={shortcut}>
                      <dt>{label}</dt>
                      <dd>
                        <kbd>{shortcut}</kbd>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="settings-description">
                  {pt
                    ? "No macOS, use ⌘ no lugar de Ctrl."
                    : "On macOS, use ⌘ instead of Ctrl."}
                </p>
              </>
            )}
          </section>
        </div>
        <footer className="settings-footer">
          <span>
            {pt
              ? "Preferências visuais salvas automaticamente"
              : "Visual preferences saved automatically"}
          </span>
          <button type="button" onClick={onClose}>
            {pt ? "Concluído" : "Done"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}

export default Settings;
