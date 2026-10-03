import { useEffect, useRef, useState, type FormEvent } from "react";
import { models, type Scenario } from "../domain/service";
import { SafeMarkdown } from "./SafeMarkdown";
import { useDomain } from "../domain/context";
import { useText } from "./translations";
const seedPt: Record<string, string> = {
  "seed-user":
    "Revise o motor de preços e sugira um plano para melhorar sua validação.",
  "seed-assistant":
    "Revisei o fluxo de preços mock. O controller já valida a quantidade e o preço unitário, e delega o cálculo ao `PricingEngine`.\n\n### Um plano objetivo\n\n1. **Cobrir os limites** — testar valores zero e o limite do desconto por volume.\n2. **Manter valores consistentes** — explicitar a política de arredondamento.\n3. **Documentar a resposta** — descrever subtotal, desconto e total.\n\nAbra o controller na árvore de arquivos para explorar a implementação. Envie uma mensagem abaixo para experimentar uma execução simulada.",
};
export function ChatPanel() {
  const { state, service, locale } = useDomain();
  const t = useText();
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  const [draft, setDraft] = useState("");
  const [scenario, setScenario] = useState<Scenario>("success");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setDraft("");
  }, [state.activeSessionId]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [session?.messages]);
  if (!session) return null;
  const busy = ["running", "waiting_permission"].includes(session.status);
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (draft.trim() && !busy) {
      service.sendMessage(session.id, draft, scenario, locale);
      setDraft("");
    }
  };
  return (
    <div className="chat-panel">
      <div className="chat-top">
        <div>
          <span className="eyebrow">{state.workspace.name} / </span>
          <strong>{session.title || t.untitled}</strong>
        </div>
        <span
          className={`run-pill ${session.status}`}
          role="status"
          aria-label={t.status}
        >
          {session.status === "failed" ? t.failure : t[session.status]}
        </span>
      </div>
      <div className="chat-messages">
        {!session.messages.length && (
          <div className="chat-welcome">
            <div className="welcome-mark">✳</div>
            <h2>{t.intro}</h2>
            <p>{t.introBody}</p>
            <button onClick={() => setDraft(t.starter)}>{t.starter} ↗</button>
          </div>
        )}
        {session.messages.map((message) => (
          <article className={`chat-message ${message.role}`} key={message.id}>
            <div className={`message-avatar ${message.role}`}>
              {message.role === "user" ? "M" : "✳"}
            </div>
            <div className="message-content">
              <header>
                <strong>
                  {message.role === "user"
                    ? t.you
                    : state.agents.find((a) => a.id === session.agentId)?.name}
                </strong>
                <span>{message.role === "assistant" ? "MOCK" : ""}</span>
              </header>
              <div className="markdown-body">
                <SafeMarkdown>
                  {(locale === "pt-BR" && seedPt[message.id]) ||
                    message.text ||
                    "…"}
                </SafeMarkdown>
              </div>
            </div>
          </article>
        ))}
        {session.status === "waiting_permission" && (
          <div className="permission-card" role="alert">
            <strong>◇ {t.waiting_permission}</strong>
            <p>{t.permissionBody}</p>
            <button onClick={() => service.resolvePermission(session.id, true)}>
              {t.allow}
            </button>
            <button
              onClick={() => service.resolvePermission(session.id, false)}
            >
              {t.deny}
            </button>
          </div>
        )}
        {session.status === "failed" && (
          <div className="error-card" role="alert">
            {t.failed}
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="composer-area" onSubmit={submit}>
        <div className="composer">
          <textarea
            aria-label={t.prompt}
            placeholder={t.prompt}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="composer-controls">
            <div className="model-controls">
              <select
                aria-label={t.agent}
                disabled={busy}
                value={session.agentId}
                onChange={(e) =>
                  service.updateSession(session.id, {
                    agentId: e.target.value,
                    model:
                      state.agents.find((a) => a.id === e.target.value)
                        ?.model || models[0],
                  })
                }
              >
                {state.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={t.model}
                disabled={busy}
                value={session.model}
                onChange={(e) =>
                  service.updateSession(session.id, { model: e.target.value })
                }
              >
                {models.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            {busy ? (
              <button
                className="send-button"
                type="button"
                aria-label={t.stop}
                title={t.stop}
                onClick={() => service.cancelRun(session.id)}
              >
                ■
              </button>
            ) : (
              <button
                className="send-button"
                type="submit"
                disabled={!draft.trim()}
                aria-label={t.send}
                title={t.send}
              >
                ↑
              </button>
            )}
          </div>
        </div>
        <div className="composer-caption">
          <span>{t.mock}</span>
          <label>
            {t.scenario}{" "}
            <select
              aria-label={t.scenario}
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
            >
              <option value="success">{t.success}</option>
              <option value="failure">{t.failure}</option>
              <option value="permission">{t.permission}</option>
            </select>
          </label>
        </div>
      </form>
    </div>
  );
}
