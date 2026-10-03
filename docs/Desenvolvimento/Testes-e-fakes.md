---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 53, 54, 55"
---

# Testes, mocks e fakes

Os cenários abaixo são planejamento de testes, não testes já executados. MockLLMService simula o serviço da UI; FakeModelProvider é um exemplo histórico de teste do loop. A forma final desse fake precisa respeitar a fachada LLMService, sem recriar uma camada de providers concorrente.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 53. Testes

### Unitários

- ContextBuilder;
- ConfigResolver;
- AgentRegistry;
- ToolRegistry;
- PermissionEngine;
- Decision policies;
- ModelRouter;
- HostRuntime adapters.

### Integração

- AgentRuntime + mock provider;
- tool calling;
- delegation;
- persistence;
- extension loading;
- IPC.

### E2E

- abrir workspace;
- criar agente;
- iniciar sessão com agente específico;
- delegar;
- executar tool;
- alterar layout;
- restart e restore.

---

## 54. Mock Provider

Criar desde cedo um provider determinístico de teste.

Exemplo:

```ts
class FakeModelProvider implements ModelProvider {
  responses = new Queue<ModelResponse>();
}
```

Isso permite testar o loop sem gastar tokens.

---

## 55. Fake Host Runtime

Criar hosts simulados:

```ts
new FakeHostRuntime({ os: 'windows' })
new FakeHostRuntime({ os: 'macos' })
new FakeHostRuntime({ os: 'linux' })
```

Isso reduz dependência de CI específico por plataforma.

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md)
