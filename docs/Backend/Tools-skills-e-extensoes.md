---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 13, 14, 15, 16, 17, 39, 40, 41, 60"
---

# Tools, skills e extensões

Skill é conteúdo instrucional; tool é execução determinística; extension é código que contribui capacidades. A infraestrutura de extensões pertence à fase 6. Worker Threads e Child Processes são alternativas de implementação, não garantias equivalentes de sandbox para código hostil.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 13. Skills

Skill é conteúdo instrucional declarativo.

Exemplo:

```text
.myharness/skills/review-architecture.md
```

Pode conter:

- instruções;
- templates;
- checklists;
- exemplos;
- procedimentos.

Uma skill não possui acesso privilegiado ao SO por si só.

---

## 14. Extensions

Extensão é código executável.

Pode registrar:

- tools;
- panels de UI;
- commands;
- providers;
- agents;
- skills;
- listeners;
- background services.

Exemplo de manifesto:

```yaml
id: com.example.git-tools
name: Git Tools
version: 1.0.0
entry: dist/index.js

contributes:
  tools:
    - git.status
    - git.diff
  panels:
    - git-panel

permissions:
  filesystem:
    read:
      - workspace
  process:
    execute:
      - git
```

---

## 15. Runtime de extensões

Não executar extensões arbitrárias dentro do processo principal.

Arquitetura recomendada:

```text
Electron Main
    ↓
Extension Host
    ↓
Isolated Worker / Child Process
    ↓
Extension SDK
```

Possíveis estratégias:

1. Worker Threads para extensões confiáveis;
2. Child Processes para isolamento mais forte;
3. sandbox externo futuramente para código não confiável.

---

## 16. Extension SDK

```ts
interface ExtensionContext {
  host: HostRuntimeApi;
  workspace: WorkspaceApi;
  sessions: SessionApi;
  agents: AgentApi;
  secrets: SecretApi;
  logger: Logger;
}
```

A extensão não recebe módulos Node diretamente.

---

## 17. Tools

### 17.1 Tool Definition

```ts
interface ToolDefinition<TInput, TOutput> {
  id: string;
  name: string;
  description: string;
  inputSchema: JsonSchema;
  permissions: PermissionRequirement[];
  execute(input: TInput, context: ToolContext): Promise<TOutput>;
}
```

---

### 17.2 Built-in tools

Exemplos iniciais:

- `files.read`;
- `files.write`;
- `files.search`;
- `shell.execute`;
- `process.spawn`;
- `web.search`;
- `workspace.info`;
- `system.environment`;
- `agent.delegate`;
- `agent.parallel_delegate`;
- `artifact.create`.

---

## 39. Segurança de extensões

Assumir que extensões podem ser maliciosas ou defeituosas.

Medidas:

- processos isolados;
- permission manifest;
- timeout;
- resource limits;
- filesystem virtualizado quando possível;
- network policy;
- assinatura/verificação futura;
- kill switch;
- logs por extensão.

---

## 40. Atualização de extensões

O extension manager deve controlar:

- versão;
- compatibilidade com API;
- permissões novas;
- changelog;
- atualização;
- rollback futuro.

Mudança de permissões deve exigir novo consentimento.

---

## 41. Versionamento de API

SDK e manifest precisam de versão:

```yaml
apiVersion: 1
```

Isso permite evoluir o runtime sem quebrar todas as extensões.

---

## 60. Exemplo de tool extension

```ts
export const tool: ToolDefinition<Input, Output> = {
  id: 'example.calculate',
  name: 'Calculate',
  description: 'Executa um cálculo determinístico.',
  inputSchema,
  permissions: [],

  async execute(input) {
    return {
      result: deterministicCalculation(input),
    };
  },
};
```

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Indice](../Contratos/Indice.md)
