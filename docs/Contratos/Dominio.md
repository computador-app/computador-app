---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 6"
---

# Modelo de domínio

Os tipos abaixo são transcritos da proposta e não constituem código compilável isoladamente. AgentTask é o payload de uma solicitação ao agente; Task é uma entidade persistente; AgentRun descreve a execução de um agente. Não usar esses nomes como sinônimos. Consulte a consolidação pendente para Execution e DTOs.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 6. Modelo de domínio principal

### 6.1 AgentDefinition

```ts
interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  scope: 'builtin' | 'user' | 'workspace' | 'extension';

  routing: AgentRoutingProfile;

  modelPolicy: ModelPolicy;

  prompts: {
    userSystemPrompt: string;
    projectPrompt?: string;
  };

  tools: ToolReference[];
  skills: SkillReference[];

  permissions: PermissionPolicy;
  memoryPolicy: MemoryPolicy;
  delegationPolicy: DelegationPolicy;
  runtimePolicy: AgentRuntimePolicy;

  metadata?: Record<string, unknown>;
}
```

---

### 6.2 AgentRoutingProfile

```ts
interface AgentRoutingProfile {
  description: string;
  preferredTasks?: string[];
  excludedTasks?: string[];
  capabilities?: string[];
  keywords?: string[];
}
```

O router usa esse perfil, não o system prompt completo.

---

### 6.3 Session

```ts
interface Session {
  id: string;
  workspaceId?: string;
  title?: string;

  rootAgentId: string;

  messages: MessageRef[];
  branches: SessionBranch[];

  createdAt: Date;
  updatedAt: Date;
}
```

---

### 6.4 AgentRun

```ts
interface AgentRun {
  id: string;
  sessionId: string;
  agentId: string;

  parentRunId?: string;
  branchId?: string;

  status:
    | 'queued'
    | 'running'
    | 'waiting_tool'
    | 'waiting_child'
    | 'completed'
    | 'failed'
    | 'cancelled';

  input: AgentTask;
  result?: AgentResult;

  startedAt?: Date;
  finishedAt?: Date;
}
```

---

### 6.5 AgentTask

```ts
interface AgentTask {
  objective: string;
  context?: string;
  constraints?: string[];
  expectedOutput?: string;
  artifacts?: ArtifactRef[];
  parentContextRefs?: ContextRef[];
}
```

---

### 6.6 AgentResult

```ts
interface AgentResult {
  status: 'success' | 'failed' | 'needs_input';
  summary: string;
  output?: string;
  artifacts?: ArtifactRef[];
  decisions?: DecisionRecord[];
  suggestedNextSteps?: string[];
}
```

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md)
