import { useDomain } from "../domain/context";
import { useText } from "./translations";
export function TerminalPanel() {
  const { state, locale } = useDomain();
  return (
    <div className="terminal-panel">
      <p>
        <span className="terminal-prompt">➜</span> {state.workspace.path}
      </p>
      <p className="terminal-muted">
        {locale === "en"
          ? "Mock terminal · process execution is unavailable in this frontend preview."
          : "Terminal mock · execução de processos indisponível nesta prévia do frontend."}
      </p>
      <p>
        <span className="terminal-prompt">$</span>{" "}
        <span className="terminal-cursor">▌</span>
      </p>
    </div>
  );
}
