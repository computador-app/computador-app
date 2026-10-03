---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 30, 32, 33, 37"
---

# Persistência, observabilidade e artifacts

> **Atualização de 03/10/2026:** a [fase 2 implementada](Fase-2-implementada.md) entrega pi-ai real, SQLite, sessões por pasta e ferramentas locais sem pedidos de permissão. As seções abaixo preservam a arquitetura planejada; recursos além desse incremento continuam futuros.


SQLite é a decisão para estado estruturado local. A lista de tabelas é conceitual e não define migrations. Tasks e tentativas de execução ainda precisam entrar no desenho persistente. Layout e sessões devem ser restauráveis no milestone mockado; traces reais serão introduzidos com os runtimes.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 30. Persistence

Recomendação inicial:

**SQLite** para dados estruturados locais.

Tabelas conceituais:

```text
workspaces
sessions
session_branches
messages
agents
agent_runs
tool_runs
decisions
artifacts
layouts
extensions
settings
memories
```

Arquivos grandes e artifacts podem permanecer no filesystem.

---

## 32. Observabilidade

Cada execução precisa produzir trace.

Exemplo:

```text
Session
 └─ AgentRun #1
     ├─ ModelCall #1
     ├─ ToolRun #1
     ├─ Decision #1
     ├─ Child AgentRun #2
     │   ├─ ModelCall #2
     │   └─ ToolRun #2
     └─ ModelCall #3
```

Registrar:

- duração;
- provider;
- modelo;
- tokens;
- custo quando disponível;
- decisões;
- tool calls;
- erros;
- retries;
- contexto truncado;
- permissões concedidas.

---

## 33. Decision Trace

Uma tela avançada pode mostrar:

```text
Agent Router
Selected: Researcher
Confidence: 88%

Alternatives:
- General: 9%
- Programmer: 3%
```

Isso é útil para:

- debugging;
- confiança do usuário;
- ajuste de routing profiles;
- análise de custo.

---

## 37. Artifacts

Agentes podem produzir artifacts.

Exemplos:

- arquivo;
- imagem;
- planilha;
- relatório;
- patch;
- diff;
- código;
- documento;
- dataset.

```ts
interface ArtifactRef {
  id: string;
  type: string;
  uri: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}
```

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Indice](../Contratos/Indice.md)
