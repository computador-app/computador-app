export interface ModelDefinition {
  id: string;
  name: string;
}
export interface ModelProvider {
  id: string;
  name: string;
  models: ModelDefinition[];
}
/** Demonstration catalog only: no provider connections or external requests. */
export const modelProviders: ModelProvider[] = [
  {
    id: "mock",
    name: "Mock",
    models: [
      { id: "Mock · Reasoning", name: "Reasoning" },
      { id: "Mock · Fast", name: "Fast" },
    ],
  },
  {
    id: "local",
    name: "Local (mock)",
    models: [{ id: "Mock · Local", name: "Local" }],
  },
  {
    id: "openrouter",
    name: "OpenRouter (mock)",
    models: Array.from({ length: 24 }, (_, i) => {
      const name = `Demo ${String(i + 1).padStart(2, "0")}`;
      return { id: `OpenRouter · ${name}`, name };
    }),
  },
];
export const models = modelProviders.flatMap((provider) =>
  provider.models.map((model) => model.id),
);
