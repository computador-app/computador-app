import { useDomain } from "../domain/context";
import { useText } from "./translations";
const eventLabels: Record<string, [string, string]> = {
  "run.started": ["Execução iniciada", "Run started"],
  "run.completed": ["Execução concluída", "Run completed"],
  "run.failed": ["Falha do provedor simulado", "Simulated provider failure"],
  "run.cancelled": ["Execução cancelada", "Run cancelled"],
  "tool.read": [
    "Leitura simulada dos arquivos do projeto",
    "Simulated project file read",
  ],
  "delegation.started": [
    "Revisão delegada ao agente mock",
    "Review delegated to mock agent",
  ],
  "delegation.completed": [
    "Revisão delegada concluída",
    "Delegated review completed",
  ],
  "permission.requested": [
    "Permissão solicitada para leitura simulada",
    "Permission requested for simulated read",
  ],
  "permission.allowed": [
    "Permissão concedida para esta execução",
    "Permission granted for this run",
  ],
};
export function ActivityPanel() {
  const { state, locale } = useDomain();
  const t = useText();
  const events = state.events.filter(
    (e) => e.sessionId === state.activeSessionId,
  );
  return (
    <div className="panel-body activity-panel">
      <div className="panel-toolbar">
        <span className="eyebrow">{t.activity}</span>
        <span className="subtle-badge">{t.simulated}</span>
      </div>
      {!events.length ? (
        <div className="empty-note">{t.noActivity}</div>
      ) : (
        <div className="activity-list">
          {events.map((event) => (
            <div className="activity-row" key={event.id}>
              <time>
                {new Date(event.time).toLocaleTimeString(locale, {
                  hour12: false,
                })}
              </time>
              <span className={`event-type ${event.type}`}>
                {event.type === "tool"
                  ? "⌘"
                  : event.type === "delegation"
                    ? "⑂"
                    : event.type === "permission"
                      ? "◇"
                      : "○"}
              </span>
              <span className="activity-source">
                {event.agentName}
                {event.delegatedAgentName && <> → {event.delegatedAgentName}</>}
              </span>
              <span>
                {eventLabels[event.text]?.[locale === "en" ? 1 : 0] ||
                  event.text}
              </span>
              <small>MOCK</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
