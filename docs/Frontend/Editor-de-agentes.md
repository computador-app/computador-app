---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 26"
---

# Editor de agentes

O editor deve produzir configuração declarativa. Na fase mockada, permitir criar e editar agentes globais e de projeto, escolher modelos do catálogo mock e selecionar um root agent para uma sessão. Não deixar o formulário depender diretamente de pi-ai.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 26. UI de criação de agentes

Campos recomendados:

```text
Identity
- Name
- Icon
- Description

Routing
- When to use
- Capabilities
- Excluded tasks

Model
- Provider
- Model
- Fixed / Automatic

Instructions
- System prompt

Tools
- Built-in tools
- Extension tools

Skills
- Selected skills

Delegation
- Can receive delegated tasks
- Can delegate
- Allowed agents
- Max delegation depth

Permissions
- Files
- Processes
- Network
- Secrets

Context
- Strategy
- Memory policy

Runtime
- Timeout
- Token budget
- Cost budget
```

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Servicos e IPC](../Contratos/Servicos-e-IPC.md)
