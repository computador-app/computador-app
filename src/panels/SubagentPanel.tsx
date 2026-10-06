import { useEffect, useMemo, useState } from "react";
import { useDomain } from "../domain/context";
import { SafeMarkdown } from "./SafeMarkdown";

export function SubagentPanel() {
  const { state, service, locale } = useDomain();
  const live = state.live;
  const pt = locale === "pt-BR";
  const [selected, setSelected] = useState("");
  const runs = useMemo(
    () =>
      (live?.subagentRuns ?? [])
        .filter((run) => run.sessionId === live?.activeSessionId)
        .sort((a, b) => a.startedAt - b.startedAt),
    [live?.subagentRuns, live?.activeSessionId],
  );
  useEffect(() => {
    if (!runs.some((run) => run.id === selected)) setSelected(runs.at(-1)?.id ?? "");
  }, [runs, selected]);
  useEffect(() => {
    const select = (event: Event) =>
      setSelected((event as CustomEvent<{ id: string }>).detail.id);
    window.addEventListener("computador:subagent", select);
    return () => window.removeEventListener("computador:subagent", select);
  }, []);
  if (!live)
    return (
      <div className="subagent-empty">
        {pt ? "Subagentes simulados aparecerão aqui." : "Simulated subagents appear here."}
      </div>
    );
  const run = runs.find((item) => item.id === selected);
  return (
    <div className="subagent-panel">
      <aside className="subagent-tree" aria-label={pt ? "Execuções" : "Runs"}>
        {!runs.length && (
          <p>{pt ? "Nenhum subagente nesta conversa." : "No subagents in this conversation."}</p>
        )}
        {runs.map((item) => (
          <button
            type="button"
            key={item.id}
            className={item.id === selected ? "selected" : ""}
            style={{ paddingLeft: 10 + Math.max(0, item.depth - 1) * 14 }}
            onClick={() => setSelected(item.id)}
          >
            <span className={`status-dot ${item.status === "running" ? "pulse" : ""}`} />
            <span>
              <strong>{item.agentName}</strong>
              <small>{item.task}</small>
            </span>
          </button>
        ))}
      </aside>
      <main className="subagent-transcript">
        {!run ? (
          <div className="subagent-empty">
            {pt ? "Selecione uma execução." : "Select a run."}
          </div>
        ) : (
          <>
            <header className="subagent-header">
              <div>
                <strong>{run.agentName}</strong>
                <small>
                  {run.agentRef} · {run.model.provider}/{run.model.modelId} · {run.status}
                </small>
              </div>
              {run.status === "running" && (
                <button
                  type="button"
                  onClick={() => void service.backend?.cancelSubagent(run.id)}
                >
                  {pt ? "Cancelar" : "Cancel"}
                </button>
              )}
            </header>
            <div className="subagent-messages">
              {run.messages.map((message) =>
                message.tool ? (
                  <details className="tool-card" key={message.id} open={message.tool.status === "running"}>
                    <summary>{message.tool.name} · {message.tool.status}</summary>
                    <pre>{JSON.stringify(message.tool.arguments, null, 2)}</pre>
                    <pre>{message.tool.result ?? "…"}</pre>
                  </details>
                ) : (
                  <article className={`chat-message ${message.role}`} key={message.id}>
                    <div className={`message-avatar ${message.role}`}>
                      {message.role === "user" ? "↳" : run.agentName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="message-content">
                      <header>
                        <strong>
                          {message.role === "user" ? (pt ? "Tarefa" : "Task") : run.agentName}
                        </strong>
                        {message.usage && <span>{message.usage.totalTokens} tokens</span>}
                      </header>
                      <div className="markdown-body">
                        {message.text ? <SafeMarkdown>{message.text}</SafeMarkdown> : "…"}
                      </div>
                    </div>
                  </article>
                ),
              )}
              {run.error && <div className="error-card">{run.error}</div>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
