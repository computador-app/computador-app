import { modelKey, type ModelRef, type AppSnapshot } from "../shared/protocol";
import { useDomain } from "../domain/context";
import { ModelSelector } from "./ModelSelector";
export function LiveModelPicker({
  state,
  value,
  onChange,
  disabled = false,
  label,
}: {
  state: AppSnapshot;
  value: ModelRef | null;
  onChange: (ref: ModelRef) => void;
  disabled?: boolean;
  label: string;
}) {
  const { locale } = useDomain();
  const providers = state.providers
    .filter((p) => p.configured && p.status === "configured")
    .map((p) => ({
      id: p.id,
      name: p.name,
      models: state.models
        .filter(
          (m) =>
            m.provider === p.id && !state.hiddenModels.includes(modelKey(m)),
        )
        .map((m) => ({ id: modelKey(m), name: m.name })),
    }));
  const selected = value
    ? state.models.find((m) => modelKey(m) === modelKey(value))
    : undefined;
  const provider = value
    ? state.providers.find((p) => p.id === value.provider)
    : undefined;
  return (
    <ModelSelector
      providers={providers}
      locale={locale}
      label={label}
      disabled={disabled}
      value={value ? modelKey(value) : ""}
      displayValue={
        value
          ? `${provider?.name ?? value.provider} · ${selected?.name ?? value.modelId}`
          : label
      }
      onChange={(key) => {
        const [provider, modelId] = JSON.parse(key);
        onChange({ provider, modelId });
      }}
    />
  );
}
