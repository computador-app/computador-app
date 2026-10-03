import { useState } from "react";
import { useDomain } from "../domain/context";
import { useText } from "./translations";
export function SessionsPanel() {
  const { state, service, newSession, selectSession, locale } = useDomain();
  const t = useText();
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState("");
  const [title, setTitle] = useState("");
  const sessions = state.sessions.filter(
    (s) =>
      s.workspaceId === state.workspace.id &&
      (s.title || t.untitled)
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <div className="panel-body sessions-panel">
      <div className="panel-toolbar">
        <span className="eyebrow">{t.today}</span>
        <button
          className="icon-button"
          onClick={newSession}
          title={t.new}
          aria-label={t.new}
        >
          ＋
        </button>
      </div>
      <div className="search-wrap">
        <span>⌕</span>
        <input
          aria-label={t.search}
          placeholder={t.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="session-list">
        {sessions.map((s) => (
          <div
            className={`session-row ${state.activeSessionId === s.id ? "selected" : ""}`}
            key={s.id}
          >
            <button
              className="session-select"
              aria-pressed={state.activeSessionId === s.id}
              onClick={() => selectSession(s.id)}
            >
              <span className="session-icon">◌</span>
              <span>
                <strong>{s.title || t.untitled}</strong>
                <small>
                  {state.agents.find((a) => a.id === s.agentId)?.name}{" "}
                  <span>· {s.messages.length}</span>
                </small>
              </span>
              {s.status === "running" && <span className="status-dot pulse" />}
            </button>
            {state.live &&
              (renaming === s.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    service.updateSession(s.id, { title });
                    setRenaming("");
                  }}
                >
                  <input
                    autoFocus
                    aria-label={
                      locale === "en" ? "Session title" : "Título da sessão"
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setRenaming("");
                    }}
                  />
                  <button type="submit">✓</button>
                </form>
              ) : (
                <button
                  className="icon-button"
                  aria-label={`${locale === "en" ? "Rename" : "Renomear"}: ${s.title || t.untitled}`}
                  onClick={() => {
                    setRenaming(s.id);
                    setTitle(s.title);
                  }}
                >
                  ✎
                </button>
              ))}
            <button
              className="delete-session icon-button"
              aria-label={`${t.remove}: ${s.title || t.untitled}`}
              onClick={() => service.deleteSession(s.id)}
            >
              ×
            </button>
          </div>
        ))}
        {!sessions.length && <p className="empty-note">{t.empty}</p>}
      </div>
      <div className="panel-bottom-note">
        <span className="status-dot" />
        {state.workspace.path}
      </div>
    </div>
  );
}
