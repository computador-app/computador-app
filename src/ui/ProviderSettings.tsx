import { useEffect, useState } from "react";
import { useDomain } from "../domain/context";
import { ModelVisibility } from "./ModelVisibility";
import { LiveModelPicker } from "./LiveModelPicker";
import {
  preferredThinkingLevel,
  ThinkingLevelSelector,
} from "./ThinkingLevelSelector";
import { modelKey } from "../shared/protocol";
export function ProviderSettings({ tab }: { tab: "providers" | "models" }) {
  const { state, service, locale } = useDomain();
  const live = state.live;
  const backend = service.backend;
  const pt = locale === "pt-BR";
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setAnswer("");
  }, [live?.auth?.prompt?.id]);
  useEffect(() => {
    setQuery("");
    setError("");
  }, [tab]);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!live || !backend)
    return (
      <p className="settings-note">
        {pt
          ? "Demonstração no navegador. Abra o aplicativo Electron para conectar provedores e salvar conversas reais."
          : "Browser demonstration. Open the Electron app to connect providers and save real conversations."}
      </p>
    );
  const prompt = live.auth?.prompt;
  const providers = live.providers.filter((p) =>
    `${p.name} ${p.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const chosen = live.providers.find((p) => p.id === selected);
  const defaultDescriptor = live.defaultModel
    ? live.models.find((model) => modelKey(model) === modelKey(live.defaultModel!))
    : undefined;
  const defaultThinkingLevels = defaultDescriptor?.thinkingLevels ?? ["off"];
  return (
    <div className="connection-settings">
      {error && (
        <p role="alert" className="error-card">
          {error}
        </p>
      )}
      {tab === "providers" ? (
        <>
          <p className="settings-description">
            {pt
              ? "Conecte uma conta por provedor com os métodos disponíveis."
              : "Connect one account per provider using its available methods."}
          </p>
          {!live.secureStorage && (
            <p className="settings-note">
              {pt
                ? "As credenciais ficam apenas em memória neste ambiente. Será necessário reconectar após fechar o app."
                : "Credentials are kept in memory in this environment. Reconnect after closing the app."}
            </p>
          )}
          <div className="provider-connections">
            {live.providers
              .filter((p) => p.configured)
              .map((p) => (
                <article className="settings-note" key={p.id}>
                  <strong>{p.name}</strong>
                  <p>
                    {p.status === "configured"
                      ? pt
                        ? "Configurado"
                        : "Configured"
                      : (p.error ??
                        (pt ? "Reconexão necessária" : "Reconnect required"))}
                  </p>
                  <div className="connection-actions">
                    <button onClick={() => setSelected(p.id)}>
                      {pt ? "Reconectar" : "Reconnect"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void act(() => backend.removeProvider(p.id))
                      }
                    >
                      {pt ? "Remover" : "Remove"}
                    </button>
                  </div>
                </article>
              ))}
          </div>
          <label className="settings-field">
            <span>{pt ? "Adicionar provedor" : "Add provider"}</span>
            <input
              type="search"
              placeholder={pt ? "Buscar provedor…" : "Search providers…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label={pt ? "Provedor" : "Provider"}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">
              {pt ? "Selecione um provedor" : "Select a provider"}
            </option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {chosen?.methods.some((m) => m.ambient) && (
            <p className="settings-note">
              {pt
                ? "Este provedor depende de credenciais já configuradas no ambiente do aplicativo. Configure o perfil ou as variáveis exigidas pelo provedor antes de conectar."
                : "This provider requires credentials configured in the application environment. Configure its profile or required environment variables before connecting."}
            </p>
          )}
          {chosen && (
            <div className="connection-actions">
              {chosen.methods.map((method) => (
                <button
                  key={method.type}
                  disabled={busy || !!live.auth?.prompt}
                  onClick={() =>
                    void act(() => backend.login(chosen.id, method.type))
                  }
                >
                  {method.type === "api_key"
                    ? pt
                      ? "Conectar com chave / configuração"
                      : "Connect with key / configuration"
                    : method.name}
                </button>
              ))}
            </div>
          )}
          {live.auth && (
            <section className="settings-note" aria-live="polite">
              <strong>
                {live.providers.find((p) => p.id === live.auth?.provider)?.name}
              </strong>
              {live.auth.message && <p>{live.auth.message}</p>}
              {live.auth.url && (
                <p>
                  {pt ? "Continue no navegador:" : "Continue in your browser:"}{" "}
                  <span className="auth-url">{live.auth.url}</span>
                </p>
              )}
              {live.auth.userCode && (
                <p>
                  <code>{live.auth.userCode}</code>
                </p>
              )}
              {prompt && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = answer;
                    setAnswer("");
                    void act(() => backend.answerAuth(prompt.id, value));
                  }}
                >
                  <label className="settings-field">
                    <span>{prompt.message}</span>
                    {prompt.type === "select" ? (
                      <select
                        autoFocus
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                      >
                        <option value="">—</option>
                        {prompt.options?.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        autoFocus
                        autoComplete="off"
                        type={prompt.type === "secret" ? "password" : "text"}
                        value={answer}
                        placeholder={prompt.placeholder}
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                    )}
                  </label>
                  <button type="submit" disabled={busy}>
                    {pt ? "Continuar" : "Continue"}
                  </button>
                </form>
              )}
              <button
                disabled={busy}
                onClick={() => {
                  setAnswer("");
                  void act(() => backend.cancelAuth());
                }}
              >
                {pt ? "Cancelar / fechar" : "Cancel / close"}
              </button>
            </section>
          )}
        </>
      ) : (
        <>
          <div className="settings-field">
            <span>
              {pt
                ? "Modelo padrão para novas sessões"
                : "Default model for new sessions"}
            </span>
            <LiveModelPicker
              state={live}
              value={live.defaultModel}
              label={pt ? "Modelo padrão" : "Default model"}
              disabled={busy}
              onChange={(model) => {
                const levels =
                  live.models.find((item) => modelKey(item) === modelKey(model))
                    ?.thinkingLevels ?? [];
                const level = preferredThinkingLevel(
                  levels,
                  live.defaultThinkingLevel,
                );
                void act(() => backend.setDefault(model, level));
              }}
            />
          </div>
          <label className="settings-field">
            <span>
              {pt
                ? "Nível de pensamento padrão"
                : "Default thinking level"}
            </span>
            <ThinkingLevelSelector
              locale={locale}
              label={
                pt
                  ? "Nível de pensamento padrão"
                  : "Default thinking level"
              }
              value={live.defaultThinkingLevel}
              levels={defaultThinkingLevels}
              disabled={busy || !live.defaultModel}
              onChange={(level) => {
                if (live.defaultModel)
                  void act(() => backend.setDefault(live.defaultModel!, level));
              }}
            />
          </label>
          <ModelVisibility
            state={live}
            pt={pt}
            busy={busy}
            onHidden={(keys, hidden) =>
              void act(() => backend.setHidden(keys, hidden))
            }
            onRefresh={() => void act(() => backend.refreshModels())}
          />
        </>
      )}
    </div>
  );
}
