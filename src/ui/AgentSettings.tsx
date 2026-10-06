import { useEffect, useMemo, useState } from "react";
import { useDomain } from "../domain/context";
import {
  modelKey,
  type AgentDefinition,
  type AgentRecord,
  type AgentRuntimeConfig,
  type AgentScope,
  type ModelRef,
  type ThinkingLevel,
} from "../shared/protocol";

const empty = (scope: AgentScope): AgentDefinition => ({
  version: 1,
  id: "",
  name: "",
  description: "",
  systemPrompt: "",
});
const levels: ThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];
const NEW_AGENT = "__new_agent__";
const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);

export function AgentSettings() {
  const { state, service, locale } = useDomain();
  const live = state.live;
  const backend = service.backend;
  const pt = locale === "pt-BR";
  const [selected, setSelected] = useState("");
  const [scope, setScope] = useState<AgentScope>("user");
  const [form, setForm] = useState<AgentDefinition>(empty("user"));
  const [baseRevision, setBaseRevision] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewAgents, setPreviewAgents] = useState(() => state.agents);
  const record = live?.agents.find((agent) => agent.ref === selected);
  const creating = selected === NEW_AGENT || !record;
  const update = (patch: Partial<AgentDefinition>) => {
    setForm((current) => ({ ...current, ...patch }));
    setDirty(true);
    setNotice("");
  };
  const load = (agent: AgentRecord) => {
    setSelected(agent.ref);
    setScope(agent.scope);
    setForm({
      version: 1,
      id: agent.id,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      ...(agent.model ? { model: agent.model } : {}),
      ...(agent.thinkingLevel ? { thinkingLevel: agent.thinkingLevel } : {}),
      ...(agent.runtime ? { runtime: agent.runtime } : {}),
    });
    setBaseRevision(agent.revision);
    setDirty(false);
    setConflict(false);
    setError("");
  };
  useEffect(() => {
    if (!live || selected) return;
    const first = live.agents[0];
    if (first) load(first);
  }, [live?.agents, selected]);
  useEffect(() => {
    if (!record || record.revision === baseRevision) return;
    if (dirty) setConflict(true);
    else load(record);
  }, [record?.revision]);
  const choose = (agent: AgentRecord) => {
    if (dirty && !window.confirm(pt ? "Descartar alterações não salvas?" : "Discard unsaved changes?"))
      return;
    load(agent);
  };
  const create = (nextScope: AgentScope) => {
    if (dirty && !window.confirm(pt ? "Descartar alterações não salvas?" : "Discard unsaved changes?"))
      return;
    setSelected(NEW_AGENT);
    setScope(nextScope);
    setForm(empty(nextScope));
    setBaseRevision(undefined);
    setDirty(false);
    setConflict(false);
    setError("");
  };
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const modelValue = form.model ? modelKey(form.model) : "";
  const knownModel = form.model
    ? live?.models.some((model) => modelKey(model) === modelValue)
    : true;
  const setRuntime = (field: keyof AgentRuntimeConfig, value: string) => {
    const runtime = { ...(form.runtime ?? {}) };
    if (!value) delete runtime[field];
    else runtime[field] = Number(value);
    update({ runtime: Object.keys(runtime).length ? runtime : undefined });
  };

  if (!backend || !live) {
    return (
      <div className="agent-settings">
        <div className="settings-note">
          <strong>{pt ? "Prévia do navegador" : "Browser preview"}</strong>
          <p>{pt ? "Alterações são temporárias e não gravam YAML." : "Changes are temporary and do not write YAML."}</p>
        </div>
        <div className="agent-preview-list">
          {previewAgents.map((agent) => (
            <div key={agent.id}>
              <input
                aria-label={`${pt ? "Nome" : "Name"}: ${agent.name}`}
                value={agent.name}
                onChange={(event) =>
                  setPreviewAgents((items) =>
                    items.map((item) =>
                      item.id === agent.id
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <textarea
                aria-label={`${pt ? "Descrição" : "Description"}: ${agent.name}`}
                value={agent.description}
                onChange={(event) =>
                  setPreviewAgents((items) =>
                    items.map((item) =>
                      item.id === agent.id
                        ? { ...item, description: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <button
                type="button"
                disabled={
                  agent.scope === "user" &&
                  previewAgents.filter((item) => item.scope === "user").length <= 1
                }
                onClick={() =>
                  setPreviewAgents((items) =>
                    items.filter((item) => item.id !== agent.id),
                  )
                }
              >
                {pt ? "Excluir" : "Delete"}
              </button>
            </div>
          ))}
          {(["user", "workspace"] as const).map((previewScope) => (
            <button
              key={previewScope}
              type="button"
              onClick={() =>
                setPreviewAgents((items) => [
                  ...items,
                  {
                    id: `preview-${items.length + 1}`,
                    name: pt ? "Novo agente" : "New agent",
                    description: pt
                      ? "Agente temporário da prévia."
                      : "Temporary preview agent.",
                    scope: previewScope,
                    model: "",
                    instructions: "",
                    canDelegate: true,
                  },
                ])
              }
            >
              {pt
                ? `Novo agente temporário · ${previewScope === "user" ? "Usuário" : "Projeto"}`
                : `New temporary agent · ${previewScope === "user" ? "User" : "Project"}`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="agent-settings">
      <p className="settings-description">
        {pt
          ? "Agentes são arquivos YAML. Alterações serão aplicadas apenas a novas conversas; novas delegações usam a versão atual."
          : "Agents are YAML files. Changes apply only to new conversations; new delegations use the current version."}
      </p>
      {error && <p className="error-card">{error}</p>}
      <div className="agent-editor-layout">
        <aside className="agent-list">
          {(["user", "project"] as const).map((group) => (
            <section key={group}>
              <header>
                <strong>{group === "user" ? (pt ? "Usuário" : "User") : pt ? "Projeto" : "Project"}</strong>
                <button
                  type="button"
                  disabled={group === "project" && !live.workspace}
                  onClick={() => create(group)}
                  aria-label={pt ? "Novo agente" : "New agent"}
                >
                  ＋
                </button>
              </header>
              {live.agents
                .filter((agent) => agent.scope === group)
                .map((agent) => (
                  <button
                    type="button"
                    key={agent.ref}
                    className={agent.ref === selected ? "selected" : ""}
                    onClick={() => choose(agent)}
                  >
                    <span>
                      <strong>{agent.name}</strong>
                      <small>{agent.description}</small>
                    </span>
                    {agent.isDefault && <em>{pt ? "Padrão" : "Default"}</em>}
                  </button>
                ))}
              {group === "project" && !live.workspace && (
                <small>{pt ? "Abra um projeto para criar agentes." : "Open a project to create agents."}</small>
              )}
            </section>
          ))}
          {!!live.agentProblems.length && (
            <section className="agent-problems">
              <header><strong>{pt ? "Arquivos com erro" : "Files with errors"}</strong></header>
              {live.agentProblems.map((problem) => (
                <div key={problem.path} title={problem.path}>
                  <strong>{problem.path.split(/[\\/]/).at(-1)}</strong>
                  <small>{problem.error}</small>
                </div>
              ))}
            </section>
          )}
        </aside>
        <form
          className="agent-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (conflict) return;
            void act(async () => {
              await backend.saveAgent({
                scope,
                definition: form,
                ...(baseRevision ? { expectedRevision: baseRevision } : {}),
              });
              setSelected(`${scope}:${form.id}`);
              setDirty(false);
              setNotice(
                pt
                  ? "Agente salvo. A alteração não afeta sessões existentes."
                  : "Agent saved. The change does not affect existing sessions.",
              );
            });
          }}
        >
          <div className="agent-form-heading">
            <div>
              <strong>{creating ? (pt ? "Novo agente" : "New agent") : form.name}</strong>
              <small>{record?.path ?? (pt ? "O caminho será definido ao salvar." : "The path is assigned on save.")}</small>
            </div>
            {!creating && (
              <div>
                {scope === "user" && !record?.isDefault && (
                  <button type="button" onClick={() => void act(() => backend.setDefaultAgent(record!.ref))}>
                    {pt ? "Tornar padrão" : "Make default"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const other: AgentScope = scope === "user" ? "project" : "user";
                    const copy = { ...form, id: `${form.id}-copy` };
                    setSelected(NEW_AGENT);
                    setScope(other);
                    setForm(copy);
                    setBaseRevision(undefined);
                    setDirty(true);
                  }}
                  disabled={scope === "user" && !live.workspace}
                >
                  {pt ? "Duplicar" : "Duplicate"}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    if (!window.confirm(`${pt ? "Excluir" : "Delete"} ${record!.name}?\n${record!.path}`)) return;
                    void act(async () => {
                      await backend.deleteAgent(record!.ref);
                      setSelected("");
                    });
                  }}
                >
                  {pt ? "Excluir" : "Delete"}
                </button>
              </div>
            )}
          </div>
          {conflict && (
            <div className="error-card">
              {pt ? "Este arquivo mudou no disco." : "This file changed on disk."}{" "}
              <button type="button" onClick={() => record && load(record)}>
                {pt ? "Recarregar" : "Reload"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected(NEW_AGENT);
                  setForm((value) => ({ ...value, id: `${value.id}-copy` }));
                  setBaseRevision(undefined);
                  setConflict(false);
                }}
              >
                {pt ? "Salvar como novo" : "Save as new"}
              </button>
            </div>
          )}
          {notice && <div className="settings-note">{notice}</div>}
          <div className="agent-form-grid">
            <label>
              <span>{pt ? "Nome" : "Name"}</span>
              <input
                value={form.name}
                maxLength={80}
                required
                onChange={(event) => {
                  const name = event.target.value;
                  update({ name, ...(creating ? { id: slug(name) } : {}) });
                }}
              />
            </label>
            <label>
              <span>ID</span>
              <input
                value={form.id}
                maxLength={64}
                pattern="[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?"
                required
                readOnly={!creating}
                onChange={(event) => update({ id: event.target.value })}
              />
            </label>
          </div>
          <label>
            <span>{pt ? "Descrição curta" : "Short description"}</span>
            <textarea value={form.description} maxLength={280} required rows={2} onChange={(event) => update({ description: event.target.value })} />
          </label>
          <div className="agent-form-grid">
            <label>
              <span>{pt ? "Modelo preferido" : "Preferred model"}</span>
              <select
                value={modelValue}
                onChange={(event) => {
                  if (!event.target.value) update({ model: undefined });
                  else {
                    const [provider, modelId] = JSON.parse(event.target.value) as [string, string];
                    update({ model: { provider, modelId } });
                  }
                }}
              >
                <option value="">{pt ? "Usar padrão" : "Use default"}</option>
                {!knownModel && form.model && <option value={modelValue}>{form.model.provider} · {form.model.modelId} ({pt ? "indisponível" : "unavailable"})</option>}
                {live.models.map((model) => <option key={modelKey(model)} value={modelKey(model)}>{model.provider} · {model.name}</option>)}
              </select>
            </label>
            <label>
              <span>{pt ? "Pensamento preferido" : "Preferred thinking"}</span>
              <select value={form.thinkingLevel ?? ""} onChange={(event) => update({ thinkingLevel: (event.target.value || undefined) as ThinkingLevel | undefined })}>
                <option value="">{pt ? "Usar padrão" : "Use default"}</option>
                {levels.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span>System prompt</span>
            <textarea className="agent-prompt" value={form.systemPrompt} maxLength={100_000} required rows={12} onChange={(event) => update({ systemPrompt: event.target.value })} />
          </label>
          <details className="agent-runtime">
            <summary>{pt ? "Limites de execução" : "Runtime limits"}</summary>
            <div className="agent-form-grid">
              {([
                ["maxDelegationDepth", "max_delegation_depth", 0, 8, 3],
                ["maxConcurrentSubagents", "max_concurrent_subagents", 1, 4, 4],
                ["maxTurns", "max_turns", 1, 100, 20],
                ["maxToolCalls", "max_tool_calls", 1, 500, 100],
                ["timeoutSeconds", "timeout_seconds", 10, 3600, 600],
              ] as const).map(([field, label, min, max, fallback]) => (
                <label key={field}>
                  <span>{label}</span>
                  <input type="number" min={min} max={max} placeholder={String(fallback)} value={form.runtime?.[field] ?? ""} onChange={(event) => setRuntime(field, event.target.value)} />
                </label>
              ))}
            </div>
          </details>
          <div className="settings-note">
            {pt
              ? "Alterações não afetam sessões existentes. Novas delegações usam a definição atual."
              : "Changes do not affect existing sessions. New delegations use the current definition."}
          </div>
          <div className="agent-form-actions">
            <button type="submit" disabled={busy || conflict || !dirty}>
              {busy ? (pt ? "Salvando…" : "Saving…") : pt ? "Salvar agente" : "Save agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
