import { useId, useState } from "react";
import { ChevronDown, Search, RefreshCw } from "lucide-react";
import {
  modelKey,
  type AppSnapshot,
  type ModelDescriptor,
} from "../shared/protocol";
import { Switch } from "./Switch";
export function ModelVisibility({
  state,
  pt,
  busy,
  onHidden,
  onRefresh,
}: {
  state: AppSnapshot;
  pt: boolean;
  busy: boolean;
  onHidden: (keys: string[], hidden: boolean) => void;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const providers = state.providers.filter((p) => p.configured);
  const hidden = new Set(state.hiddenModels);
  const groups = providers.map((p) => ({
    provider: p,
    all: state.models.filter((m) => m.provider === p.id),
  }));
  const search = query.trim().toLocaleLowerCase();
  return (
    <section
      className="model-visibility"
      aria-label={pt ? "Visibilidade dos modelos" : "Model visibility"}
    >
      <header className="visibility-heading">
        <div>
          <h4>{pt ? "Modelos nos seletores" : "Models in selectors"}</h4>
          <p>
            {pt
              ? "Ative os modelos que você quer ver. O padrão e as conversas existentes não mudam."
              : "Enable the models you want to see. Your default and existing conversations stay unchanged."}
          </p>
        </div>
        <button
          type="button"
          className="catalog-refresh"
          disabled={busy}
          onClick={onRefresh}
          aria-label={pt ? "Atualizar catálogo" : "Refresh catalog"}
          title={pt ? "Atualizar catálogo" : "Refresh catalog"}
        >
          <RefreshCw size={15} />
        </button>
      </header>
      <div className="visibility-search">
        <Search size={16} />
        <input
          type="search"
          aria-label={pt ? "Buscar modelos" : "Search models"}
          placeholder={
            pt ? "Buscar modelo ou provedor…" : "Search models or providers…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="visibility-groups">
        {groups.map(({ provider, all }, i) => {
          const matches = all.filter((m) =>
            `${m.name} ${m.modelId} ${provider.name}`
              .toLocaleLowerCase()
              .includes(search),
          );
          if (search && !matches.length) return null;
          return (
            <ProviderGroup
              key={provider.id}
              name={provider.name}
              all={all}
              matches={matches}
              hidden={hidden}
              pt={pt}
              busy={busy}
              searching={!!search}
              initiallyOpen={i === 0}
              onHidden={onHidden}
            />
          );
        })}
      </div>
      {!providers.length && (
        <p className="model-menu-empty">
          {pt
            ? "Conecte um provedor na aba Provedores."
            : "Connect a provider in the Providers tab."}
        </p>
      )}
      {!!search &&
        !groups.some((g) =>
          g.all.some((m) =>
            `${m.name} ${m.modelId} ${g.provider.name}`
              .toLocaleLowerCase()
              .includes(search),
          ),
        ) && (
          <p className="model-menu-empty">
            {pt
              ? "Nenhum modelo encontrado. Tente outro nome."
              : "No models found. Try another name."}
          </p>
        )}
    </section>
  );
}
function ProviderGroup({
  name,
  all,
  matches,
  hidden,
  pt,
  busy,
  searching,
  initiallyOpen,
  onHidden,
}: {
  name: string;
  all: ModelDescriptor[];
  matches: ModelDescriptor[];
  hidden: Set<string>;
  pt: boolean;
  busy: boolean;
  searching: boolean;
  initiallyOpen: boolean;
  onHidden: (keys: string[], hidden: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(initiallyOpen);
  const id = useId();
  const open = searching || expanded;
  const visible = all.filter((m) => !hidden.has(modelKey(m))).length;
  return (
    <section className="visibility-provider" aria-label={name}>
      <button
        type="button"
        className="visibility-provider-heading"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="provider-monogram" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="provider-heading-copy">
          <strong>{name}</strong>
          <small>
            {pt
              ? `${visible} de ${all.length} visíveis`
              : `${visible} of ${all.length} visible`}
          </small>
        </span>
        <ChevronDown size={16} className={open ? "expanded" : ""} />
      </button>
      {open && (
        <div id={id}>
          <div className="visibility-bulk">
            <span>
              {searching
                ? pt
                  ? `${matches.length} encontrados`
                  : `${matches.length} matches`
                : pt
                  ? "Visibilidade"
                  : "Visibility"}
            </span>
            <div>
              <button
                type="button"
                disabled={busy || visible === all.length}
                onClick={() => onHidden(all.map(modelKey), false)}
              >
                {pt ? "Mostrar todos" : "Show all"}
              </button>
              <button
                type="button"
                disabled={busy || visible === 0}
                onClick={() => onHidden(all.map(modelKey), true)}
              >
                {pt ? "Ocultar todos" : "Hide all"}
              </button>
            </div>
          </div>
          {searching && (
            <p className="visibility-bulk-hint">
              {pt
                ? "As ações “todos” se aplicam ao provedor inteiro."
                : "“All” actions apply to the entire provider."}
            </p>
          )}
          <div className="visibility-model-list">
            {matches.map((m) => (
              <label className="visibility-model" key={modelKey(m)}>
                <span>
                  <strong>{m.name}</strong>
                  <small>{m.modelId}</small>
                </span>
                <Switch
                  aria-label={`${pt ? "Mostrar" : "Show"} ${m.name}`}
                  checked={!hidden.has(modelKey(m))}
                  disabled={busy}
                  onChange={(e) => onHidden([modelKey(m)], !e.target.checked)}
                />
              </label>
            ))}
            {!all.length && (
              <p className="model-menu-empty">
                {pt
                  ? "Nenhum modelo no catálogo."
                  : "No models in the catalog."}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
