---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 50, 67"
---

# Fases do MVP

A sequência é frontend-first: validar a experiência principal com mocks antes de integrar LLM e ferramentas reais. Os contratos de Task, ExecutionRuntime, WorkspaceContext e HostRuntime devem preparar a evolução local/remota, sem antecipar o servidor.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 50. Estratégia de MVP

O MVP é **frontend-first** e utiliza mocks agressivamente. A arquitetura, porém, deve evitar qualquer dependência estrutural de execução exclusivamente local.

O futuro Remote Runtime Server não será implementado nesta fase. Entram no MVP apenas os contratos mínimos de `Task`, `ExecutionRuntime`, `WorkspaceContext` e `HostRuntime`, com implementação local, para que a evolução distribuída não exija reescrita do domínio.


O MVP deve seguir uma estratégia **frontend-first com contratos estáveis e implementações mockadas**.

A intenção não é criar uma UI descartável. A interface deve ser construída sobre os mesmos contratos que serão usados pelo runtime real; inicialmente, porém, esses contratos são atendidos por mocks/fakes.

Isso permite validar cedo:

- estrutura visual;
- sistema de docking;
- fluxo de navegação;
- criação e edição de agentes;
- sessões;
- seleção de provider/modelo;
- permissões;
- estados de execução;
- experiência de delegação;
- layouts persistíveis.

### Fase 1 — Shell desktop e arquitetura visual

- Electron;
- React + TypeScript + Vite;
- Dockview ou equivalente;
- `PanelRegistry`;
- `PanelInstance`;
- `LayoutManager`;
- `CommandRegistry`;
- `EventBus`;
- preload e typed IPC já definidos, mesmo com backend mockado;
- workspace visual;
- persistência local de preferências/layout.

Painéis iniciais:

- Chat;
- Files;
- Sessions;
- Agents;
- Terminal placeholder;
- Settings.

### Fase 2 — Domínio no frontend com mocks

Definir os contratos reais de aplicação e criar implementações fake:

```text
AgentService      → MockAgentService
SessionService    → MockSessionService
WorkspaceService  → MockWorkspaceService
RuntimeService    → MockRuntimeService
LLMService        → MockLLMService
ToolService       → MockToolService
```

O frontend não deve saber se está consumindo mock ou implementação real.

Nesta fase devem funcionar:

- agentes globais e de projeto;
- criação/edição de `AgentDefinition`;
- root agent por sessão;
- lista simulada de providers/modelos;
- sessões persistidas;
- streaming simulado;
- tool calls simuladas;
- delegação simulada;
- estados `running`, `waiting`, `completed`, `failed`;
- prompts de permissão simulados.

### Fase 3 — Integração real com pi-ai

Substituir apenas a implementação de `LLMService`:

```text
MockLLMService
      ↓
PiAILLMService
      ↓
pi-ai
```

Nenhum painel deve precisar ser reescrito para essa troca.

### Fase 4 — Agent Runtime e Host Runtime reais

Implementar progressivamente:

- `AgentRuntime`;
- montagem do system prompt;
- loop agêntico;
- Host Runtime;
- filesystem;
- processes;
- shell;
- tool execution;
- permission engine;
- persistência real dos runs.

Os mocks passam a ser substituídos serviço por serviço.

### Fase 5 — Multi-agent real

- delegação;
- `AgentRun`;
- parent/child runs;
- profundidade máxima;
- paralelismo controlado;
- UI de active agents.

O Decision Engine/Jev fica fora do caminho crítico inicial. A primeira delegação pode ser decidida pelo próprio modelo via tool interna.

### Fase 6 — Extensibilidade

- Extension SDK;
- manifests;
- tool extensions;
- Extension Host isolado;
- panel extensions;
- versionamento da API;
- permissões de extensões.

### Fase 7 — UX e inteligência avançadas

- Jev / Decision Engine;
- Agent Router;
- model routing automático;
- tool routing;
- branches;
- decision trace;
- background runs;
- layouts/presets avançados.

### Critério de sucesso do primeiro milestone

Antes de conectar um LLM real, o usuário deve conseguir:

```text
abrir um workspace
   ↓
organizar painéis
   ↓
criar um agente
   ↓
selecionar provider/modelo mockado
   ↓
criar uma sessão com esse root agent
   ↓
enviar uma mensagem
   ↓
ver streaming e tool calls simuladas
   ↓
ver uma delegação simulada
   ↓
fechar e reabrir o app preservando o layout e o estado esperado
```

Quando essa experiência estiver sólida, o backend real pode substituir os mocks progressivamente sem alterar a arquitetura visual.

---

## 67. Próximo passo recomendado

O primeiro incremento deve ser a **vertical slice visual mockada**, e não o runtime completo.

Construir:

```text
Electron Shell
   ↓
Docking Workspace
   ↓
Panel Registry
   ↓
Chat / Files / Sessions / Agents
   ↓
Application Service Contracts
   ↓
Mock Services
```

A prioridade é validar o modelo modular da interface e os contratos que separarão renderer, aplicação e runtime.

Primeira sequência recomendada:

1. bootstrap Electron + React + TypeScript + Vite;
2. preload mínimo e typed bridge;
3. `PanelRegistry`, `PanelInstance` e `LayoutManager`;
4. Dockview e persistência de layout;
5. `CommandRegistry` e `EventBus`;
6. interfaces de `WorkspaceService`, `AgentService`, `SessionService`, `LLMService` e `RuntimeService`;
7. implementações mock;
8. painel de agentes;
9. painel de sessões;
10. chat com streaming/tool-call/delegation simulados;
11. editor de configuração de agente;
12. somente então integração real com `pi-ai` e início do `AgentRuntime`.

A regra para esse estágio é simples:

> **O frontend pode ser mockado, mas seus contratos não podem ser descartáveis.**

Isso permite desenvolver a experiência principal rapidamente sem comprometer a arquitetura futura.

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](Pendencias.md)
