---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 31, 34"
---

# Eventos e streaming

Event Bus distribui notificações internas; RuntimeEvent representa streaming para o consumidor. Os nomes não são um único protocolo consolidado. O catálogo remoto futuro está na nota de runtime distribuído. Antes de implementar, fechar envelopes, correlação, erros, cancelamento e descarte de assinaturas.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 31. Event Bus

Criar um barramento interno de eventos.

Eventos exemplares:

```text
session.created
session.updated
agent.run.started
agent.run.completed
agent.run.failed
tool.run.started
tool.run.completed
decision.made
artifact.created
extension.enabled
workspace.opened
```

Isso reduz acoplamento entre runtime, UI e observabilidade.

---

## 34. Streaming

O runtime deve emitir eventos em streaming.

```ts
type RuntimeEvent =
  | { type: 'token'; data: string }
  | { type: 'tool-start'; toolId: string }
  | { type: 'tool-result'; result: unknown }
  | { type: 'delegation-start'; agentId: string }
  | { type: 'delegation-end'; result: AgentResult }
  | { type: 'artifact'; artifact: ArtifactRef }
  | { type: 'done' };
```

O renderer consome esses eventos via IPC tipado.

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md)
