import { useState } from "react";
import { models, type Agent } from "../domain/service";
import { useDomain } from "../domain/context";
import { useText } from "./translations";
export function AgentsPanel() {
  const { state, service } = useDomain();
  const t = useText();
  const [editing, setEditing] = useState<
    (Omit<Agent, "id"> & { id?: string }) | null
  >(null);
  const blank = () =>
    setEditing({
      name: "",
      description: "",
      scope: "workspace",
      model: models[0],
      instructions: "",
      canDelegate: true,
    });
  return (
    <div className="panel-body agents-panel">
      <div className="panel-toolbar">
        <span className="eyebrow">{t.agents}</span>
        <button aria-label={t.newAgent} title={t.newAgent} onClick={blank}>
          ＋
        </button>
      </div>
      {editing ? (
        <form
          className="agent-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (editing.name.trim()) {
              service.saveAgent(editing);
              setEditing(null);
            }
          }}
        >
          <label>
            {t.name}
            <input
              required
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
          <label>
            {t.description}
            <input
              value={editing.description}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
            />
          </label>
          <label>
            {t.scope}
            <select
              aria-label={t.scope}
              value={editing.scope}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  scope: e.target.value as Agent["scope"],
                })
              }
            >
              <option value="workspace">{t.project}</option>
              <option value="user">{t.global}</option>
            </select>
          </label>
          <label>
            {t.model}
            <select
              aria-label={t.model}
              value={editing.model}
              onChange={(e) =>
                setEditing({ ...editing, model: e.target.value })
              }
            >
              {models.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            {t.instructions}
            <textarea
              rows={4}
              value={editing.instructions}
              onChange={(e) =>
                setEditing({ ...editing, instructions: e.target.value })
              }
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={editing.canDelegate}
              onChange={(e) =>
                setEditing({ ...editing, canDelegate: e.target.checked })
              }
            />
            {t.delegate}
          </label>
          <div className="form-actions">
            <button type="button" onClick={() => setEditing(null)}>
              {t.cancel}
            </button>
            <button type="submit" className="primary-button">
              {t.save}
            </button>
          </div>
        </form>
      ) : (
        <div className="agent-list">
          {state.agents.map((agent) => (
            <button
              className="agent-card"
              key={agent.id}
              aria-label={`${t.edit}: ${agent.name}`}
              onClick={() => setEditing({ ...agent })}
            >
              <span className="agent-avatar">✳</span>
              <span>
                <strong>{agent.name}</strong>
                <small>{agent.description}</small>
                <em>
                  {agent.scope === "workspace" ? t.project : t.global} ·{" "}
                  {agent.model}
                </em>
              </span>
              <span>↗</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
