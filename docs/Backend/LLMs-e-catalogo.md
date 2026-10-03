---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 11, 12"
---

# LLMs e catálogo

Na fase 2, MockLLMService atende o contrato; na fase 3, PiAILLMService assume a integração real. Apenas o adaptador conhece a API concreta do pi-ai. Descritores e eventos do harness ainda precisam ser especificados; versões ou capacidades atuais da biblioteca não foram verificadas nesta documentação.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 11. Integração com LLMs via pi-ai

O harness **não deve reimplementar a abstração de providers e modelos**. Essa responsabilidade será delegada ao `pi-ai`, que passa a ser a camada especializada de integração com LLMs.

O projeto deve manter apenas uma fachada fina própria para evitar espalhar a API concreta do `pi-ai` por todo o código:

```ts
interface LLMService {
  getProviders(): Promise<ProviderDescriptor[]>;
  getModels(providerId?: string): Promise<ModelDescriptor[]>;
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterable<LLMEvent>;
}
```

Implementação inicial:

```ts
class PiAILLMService implements LLMService {
  // delega para pi-ai
}
```

Regra arquitetural:

```text
AgentRuntime
   ↓
LLMService
   ↓
PiAILLMService
   ↓
pi-ai
   ↓
Providers / Models
```

Somente `PiAILLMService` conhece diretamente o `pi-ai`. O `AgentRuntime`, a UI e o domínio trabalham com os contratos internos do harness.

Isso evita recriar:

- conexão com providers;
- compatibilidade entre APIs;
- catálogo de modelos;
- streaming específico por provider;
- diferenças de tool calling entre providers.

---

## 12. Catálogo de modelos

O frontend não deve possuir uma lista hardcoded de providers ou modelos.

A UI consulta `LLMService`, que por sua vez obtém essas informações do `pi-ai`.

```ts
interface ModelRef {
  provider: string;
  modelId: string;
}
```

A definição de agente persiste apenas a referência necessária:

```ts
interface AgentModelConfig {
  provider: string;
  modelId: string;
}
```

Capabilities devem ser normalizadas pela fachada quando forem relevantes para o harness:

```ts
interface ModelCapabilities {
  toolCalling: boolean;
  vision: boolean;
  structuredOutput: boolean;
  reasoningLevels?: string[];
  contextWindow?: number;
}
```

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Indice](../Contratos/Indice.md)
