import { useDomain } from "../domain/context";
import { useText } from "./translations";
export function TerminalPanel() {
  const { state, locale } = useDomain();
  if (state.live) {
    const session = state.live.sessions.find(
      (s) => s.id === state.live?.activeSessionId,
    );
    const commands =
      session?.messages.filter((m) => m.tool?.name === "run_shell") ?? [];
    return (
      <div className="terminal-panel">
        <p className="terminal-prompt">{state.workspace.path}</p>
        {!commands.length && (
          <p>
            {locale === "en"
              ? "Agent commands will appear here."
              : "Os comandos do agente aparecerão aqui."}
          </p>
        )}
        {commands.map((m) => (
          <section key={m.id}>
            <pre>$ {String(m.tool!.arguments.command)}</pre>
            <pre>{m.tool!.result ?? "…"}</pre>
          </section>
        ))}
      </div>
    );
  }
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
