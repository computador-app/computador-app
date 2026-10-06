import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useDomain } from "../domain/context";
import { LiveModelPicker } from "../ui/LiveModelPicker";
import { ImageAttachmentPicker } from "../ui/ImageAttachmentPicker";
import {
  preferredThinkingLevel,
  ThinkingLevelSelector,
} from "../ui/ThinkingLevelSelector";
import { modelKey, type ImageAttachment } from "../shared/protocol";
import { SafeMarkdown } from "./SafeMarkdown";
export function LiveChatPanel() {
  const {
    state,
    service,
    locale,
    newSession,
    openWorkspace,
    openSubagent,
  } = useDomain();
  const live = state.live!;
  const backend = service.backend!;
  const pt = locale === "pt-BR";
  const session = live.sessions.find((s) => s.id === live.activeSessionId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<
    Record<string, ImageAttachment[]>
  >({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const draft = session ? (drafts[session.id] ?? "") : "";
  const attached = session ? (attachments[session.id] ?? []) : [];
  const selectedModel = session?.model
    ? live.models.find(
        (model) => modelKey(model) === modelKey(session.model!),
      )
    : undefined;
  const supportsImages = selectedModel?.input.includes("image") ?? false;
  const agentRecord = session
    ? live.agents.find((agent) => agent.ref === session.agentRef)
    : undefined;
  const agentName = session?.agentSnapshot?.name ?? agentRecord?.name ?? "Computador";
  const setDraft = (text: string) => {
    if (session) setDrafts((prev) => ({ ...prev, [session.id]: text }));
  };
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [session?.messages]);
  useEffect(() => {
    setError("");
  }, [session?.id]);
  useEffect(() => {
    if (!session || supportsImages) return;
    setAttachments((previous) => {
      if (!previous[session.id]?.length) return previous;
      return { ...previous, [session.id]: [] };
    });
  }, [session?.id, supportsImages]);
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
    if ((!draft.trim() && !attached.length) || busy || sending) return;
    const text = draft.trim();
    const images = attached;
    const id = session.id;
    setSending(true);
    try {
      await backend.sendMessage(id, text, locale, images);
      setDrafts((prev) => ({ ...prev, [id]: "" }));
      setAttachments((prev) => ({ ...prev, [id]: [] }));
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
          <div className="chat-agent-select">
            {!session.messages.length && !session.agentSnapshot ? (
              <select
                aria-label={pt ? "Agente da conversa" : "Conversation agent"}
                value={session.agentRef}
                disabled={busy || sending}
                onChange={(event) =>
                  void act(() =>
                    backend.updateSession(session.id, {
                      agentRef: event.target.value as typeof session.agentRef,
                    }),
                  )
                }
              >
                {(["user", "project"] as const).map((scope) => (
                  <optgroup
                    key={scope}
                    label={
                      scope === "user"
                        ? pt
                          ? "Usuário"
                          : "User"
                        : pt
                          ? "Projeto"
                          : "Project"
                    }
                  >
                    {live.agents
                      .filter((agent) => agent.scope === scope)
                      .map((agent) => (
                        <option key={agent.ref} value={agent.ref}>
                          {agent.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <small>{agentName}</small>
            )}
          </div>
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
              {m.tool.subagentRunId && (
                <button
                  type="button"
                  className="open-subagent"
                  onClick={() => openSubagent(m.tool!.subagentRunId!)}
                >
                  {pt ? "Abrir no painel Subagente" : "Open in Subagent panel"}
                </button>
              )}
            </details>
          ) : (
            <article key={m.id} className={`chat-message ${m.role}`}>
              <div className={`message-avatar ${m.role}`}>
                {m.role === "user" ? "M" : agentName.slice(0, 2).toUpperCase()}
              </div>
              <div className="message-content">
                <header>
                  <strong>
                    {m.role === "user" ? (pt ? "Você" : "You") : agentName}
                  </strong>
                  {m.model && (
                    <span>
                      {m.model.provider} · {m.model.modelId}
                    </span>
                  )}
                </header>
                <div className="markdown-body">
                  {m.images?.length ? (
                    <div className="message-images">
                      {m.images.map((image, index) => (
                        <img
                          key={`${image.name}-${index}`}
                          src={`data:${image.mimeType};base64,${image.data}`}
                          alt={image.name}
                        />
                      ))}
                    </div>
                  ) : null}
                  {m.text ? <SafeMarkdown>{m.text}</SafeMarkdown> : null}
                  {!m.text && !m.images?.length ? "…" : null}
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
        {session.modelNotice && (
          <div className="settings-note">{session.modelNotice}</div>
        )}
        <div ref={end} />
      </div>
      <form className="composer-area" onSubmit={submit}>
        <div className="composer">
          {!!attached.length && (
            <div className="composer-attachments">
              {attached.map((image, index) => (
                <div className="composer-attachment" key={`${image.name}-${index}`}>
                  <img
                    src={`data:${image.mimeType};base64,${image.data}`}
                    alt=""
                  />
                  <span title={image.name}>{image.name}</span>
                  <button
                    type="button"
                    aria-label={`${pt ? "Remover" : "Remove"} ${image.name}`}
                    disabled={busy || sending}
                    onClick={() =>
                      setAttachments((previous) => ({
                        ...previous,
                        [session.id]: (previous[session.id] ?? []).filter(
                          (_, item) => item !== index,
                        ),
                      }))
                    }
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              {supportsImages && (
                <ImageAttachmentPicker
                  locale={locale}
                  disabled={busy || sending || attached.length >= 4}
                  onError={setError}
                  onAdd={(image) =>
                    setAttachments((previous) => ({
                      ...previous,
                      [session.id]: [
                        ...(previous[session.id] ?? []),
                        image,
                      ].slice(0, 4),
                    }))
                  }
                />
              )}
              <span>{agentName}</span>
              <LiveModelPicker
                state={live}
                value={session.model}
                label={pt ? "Modelo" : "Model"}
                disabled={busy || sending}
                onChange={(model) => {
                  const descriptor = live.models.find(
                    (item) => modelKey(item) === modelKey(model),
                  );
                  const thinkingLevel = preferredThinkingLevel(
                    descriptor?.thinkingLevels ?? [],
                    session.thinkingLevel,
                  );
                  if (!descriptor?.input.includes("image"))
                    setAttachments((previous) => ({
                      ...previous,
                      [session.id]: [],
                    }));
                  void act(() =>
                    backend.updateSession(session.id, {
                      model,
                      thinkingLevel,
                    }),
                  );
                }}
              />
              <ThinkingLevelSelector
                locale={locale}
                label={pt ? "Nível de pensamento" : "Thinking level"}
                value={session.thinkingLevel}
                levels={selectedModel?.thinkingLevels ?? ["off"]}
                disabled={busy || sending}
                onChange={(thinkingLevel) =>
                  void act(() =>
                    backend.updateSession(session.id, { thinkingLevel }),
                  )
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
                disabled={(!draft.trim() && !attached.length) || sending}
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
