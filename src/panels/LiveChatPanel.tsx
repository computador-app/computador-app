import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDomain } from "../domain/context";
import { LiveModelPicker } from "../ui/LiveModelPicker";
import { SafeMarkdown } from "./SafeMarkdown";
export function LiveChatPanel() {
  const { state, service, locale, newSession, openWorkspace } = useDomain();
  const live = state.live!;
  const backend = service.backend!;
  const pt = locale === "pt-BR";
  const session = live.sessions.find((s) => s.id === live.activeSessionId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const draft = session ? (drafts[session.id] ?? "") : "";
  const setDraft = (text: string) => {
    if (session) setDrafts((prev) => ({ ...prev, [session.id]: text }));
  };
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [session?.messages]);
  useEffect(() => {
    setError("");
  }, [session?.id]);
  const act = async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (!session)
    return (
      <div className="chat-welcome">
        <div className="welcome-mark">✳</div>
        <h2>{pt ? "Por onde vamos começar?" : "Where should we start?"}</h2>
        <p>
          {live.workspace
            ? pt
              ? "Crie uma conversa para este projeto."
              : "Create a conversation for this project."
            : pt
              ? "Abra uma pasta para começar."
              : "Open a folder to get started."}
        </p>
        <button
          onClick={() => (live.workspace ? newSession() : openWorkspace(""))}
        >
          {live.workspace
            ? pt
              ? "Nova conversa"
              : "New conversation"
            : pt
              ? "Abrir pasta"
              : "Open folder"}
        </button>
      </div>
    );
  const busy = session.status === "running";
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || busy || sending) return;
    const text = draft;
    const id = session.id;
    setSending(true);
    try {
      await backend.sendMessage(id, text, locale);
      setDrafts((prev) => ({ ...prev, [id]: "" }));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };
  const status = {
    idle: pt ? "Pronto" : "Ready",
    running: pt ? "Trabalhando" : "Working",
    completed: pt ? "Concluído" : "Completed",
    failed: pt ? "Falha" : "Failed",
    cancelled: pt ? "Cancelado" : "Cancelled",
    interrupted: pt ? "Interrompido" : "Interrupted",
  };
  return (
    <div className="chat-panel">
      <div className="chat-top">
        <div>
          <span className="eyebrow">{live.workspace?.name} / </span>
          <strong>
            {session.title || (pt ? "Nova conversa" : "New conversation")}
          </strong>
        </div>
        <span
          className={`run-pill ${session.status}`}
          role="status"
          aria-label={pt ? "Status da execução" : "Run status"}
        >
          {status[session.status]}
        </span>
      </div>
      <div className="chat-messages">
        {!session.messages.length && (
          <div className="chat-welcome">
            <h2>
              {pt
                ? "Como posso ajudar neste projeto?"
                : "How can I help with this project?"}
            </h2>
          </div>
        )}
        {session.messages.map((m) =>
          m.tool ? (
            <details
              className="tool-card"
              key={m.id}
              open={m.tool.status === "running"}
            >
              <summary>
                {m.tool.name} · {status[m.tool.status]}
              </summary>
              <pre>{JSON.stringify(m.tool.arguments, null, 2)}</pre>
              <pre>{m.tool.result ?? "…"}</pre>
            </details>
          ) : (
            <article key={m.id} className={`chat-message ${m.role}`}>
              <div className={`message-avatar ${m.role}`}>
                {m.role === "user" ? "M" : "✳"}
              </div>
              <div className="message-content">
                <header>
                  <strong>
                    {m.role === "user" ? (pt ? "Você" : "You") : "Computador"}
                  </strong>
                  {m.model && (
                    <span>
                      {m.model.provider} · {m.model.modelId}
                    </span>
                  )}
                </header>
                <div className="markdown-body">
                  <SafeMarkdown>{m.text || "…"}</SafeMarkdown>
                </div>
                {m.incomplete && (
                  <small>
                    {busy
                      ? pt
                        ? "Respondendo…"
                        : "Responding…"
                      : pt
                        ? "Resposta incompleta"
                        : "Incomplete response"}
                  </small>
                )}
                {m.usage && (
                  <small className="usage-label">
                    {m.usage.totalTokens} tokens
                    {m.usage.cost !== undefined
                      ? ` · ~$${m.usage.cost.toFixed(5)}`
                      : ""}
                  </small>
                )}
              </div>
            </article>
          ),
        )}
        {(error || session.error) && (
          <div role="alert" className="error-card">
            {error || session.error}
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="composer-area" onSubmit={submit}>
        <div className="composer">
          <textarea
            aria-label={
              pt
                ? "Pergunte algo sobre seu projeto…"
                : "Ask anything about your project…"
            }
            placeholder={
              pt
                ? "Pergunte algo sobre seu projeto…"
                : "Ask anything about your project…"
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <div className="composer-controls">
            <div className="model-controls">
              <span>Computador</span>
              <LiveModelPicker
                state={live}
                value={session.model}
                label={pt ? "Modelo" : "Model"}
                disabled={busy || sending}
                onChange={(model) =>
                  void act(() => backend.updateSession(session.id, { model }))
                }
              />
            </div>
            {busy ? (
              <button
                className="send-button"
                type="button"
                aria-label={pt ? "Interromper resposta" : "Stop response"}
                onClick={() => void act(() => backend.cancelRun(session.id))}
              >
                ■
              </button>
            ) : (
              <button
                className="send-button"
                type="submit"
                aria-label={pt ? "Enviar mensagem" : "Send message"}
                disabled={!draft.trim() || sending}
              >
                ↑
              </button>
            )}
          </div>
        </div>
        <div className="composer-caption">
          {pt
            ? "Leitura, escrita e shell · sem pedidos de permissão"
            : "Read, write and shell · no approval prompts"}
        </div>
      </form>
    </div>
  );
}
