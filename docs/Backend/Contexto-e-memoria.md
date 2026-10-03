---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 22, 23, 24"
---

# Contexto, memória e branches

O ContextBuilder compõe instruções internas, contexto de projeto, histórico, memória e resultados. Estratégias de redução de contexto evitam enviar todo o histórico a subagentes. Branches avançados e memória semântica não são requisitos do primeiro milestone.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 22. Context Builder

Responsável por montar o contexto final enviado ao modelo.

Entradas possíveis:

- core prompt;
- agent prompt;
- project prompt;
- session context;
- conversation messages;
- memory;
- workspace facts;
- selected tools;
- active task;
- delegation results;
- artifacts.

---

### 22.1 Context Strategy

Cada agente pode definir:

```ts
type ContextStrategy =
  | 'full'
  | 'summary'
  | 'task-only'
  | 'adaptive';
```

Para subagentes, evitar enviar o histórico completo por padrão.

---

## 23. Memory

Separar pelo menos três níveis:

```text
Session Memory
Workspace Memory
User Memory
```

E opcionalmente:

```text
Agent-scoped Memory
```

A memória deve ser uma API independente do provider.

---

## 24. Conversas e branches

Uma conversa pode trocar de agente sem destruir o histórico.

Exemplo:

```text
Message A
  ↓
Message B
  ↓
Message C
  ├─ Branch: Programmer
  └─ Branch: Architect
```

Cada branch pode manter:

- root agent;
- modelo;
- resumo;
- contexto adicional;
- tool state.

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Indice](../Contratos/Indice.md)
