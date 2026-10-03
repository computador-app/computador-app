---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 44, 45, 46, 47"
---

# Fluxos de aplicação

Os diagramas descrevem a arquitetura alvo. Nas fases 1 e 2, serviços mockados atendem os mesmos limites da aplicação; descoberta de extensões e roteamento inteligente não precisam estar implementados. No fluxo de mensagem, Model Provider representa a cadeia LLMService → PiAILLMService → pi-ai.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 44. Fluxo de inicialização

```mermaid
sequenceDiagram
    participant App as Electron Main
    participant Config as Config Loader
    participant Host as Host Runtime
    participant Ext as Extension Manager
    participant Reg as Registries
    participant DB as Persistence
    participant UI as Renderer

    App->>Config: Load user config
    App->>Host: Detect platform and capabilities
    App->>DB: Open database
    App->>Ext: Discover extensions
    Ext->>Reg: Register tools/agents/providers/panels
    App->>UI: Create window
    UI->>App: Request initial state
    App-->>UI: Workspaces, sessions, agents, layout
```

---

## 45. Fluxo ao abrir um projeto

```mermaid
sequenceDiagram
    participant UI
    participant WS as Workspace Service
    participant CFG as Config Resolver
    participant REG as Registries
    participant RT as Runtime

    UI->>WS: open(path)
    WS->>CFG: load .myharness
    CFG->>CFG: merge user + workspace config
    CFG->>REG: register workspace agents/tools/skills
    WS->>RT: set active workspace
    WS-->>UI: WorkspaceReady
```

---

## 46. Fluxo de uma mensagem

```mermaid
sequenceDiagram
    participant U as User
    participant UI
    participant CR as Conversation Runtime
    participant AR as Agent Runtime
    participant MR as Model Router
    participant LLM as Model Provider
    participant TR as Tool Runtime

    U->>UI: Send message
    UI->>CR: session.send()
    CR->>AR: run(rootAgent)
    AR->>MR: resolve model
    MR-->>AR: selected model
    AR->>LLM: completion

    alt tool call
      LLM-->>AR: tool request
      AR->>TR: execute tool
      TR-->>AR: tool result
      AR->>LLM: continue
    else final answer
      LLM-->>AR: final
    end

    AR-->>CR: AgentResult
    CR-->>UI: stream/final
```

---

## 47. Fluxo de delegação automática

```mermaid
sequenceDiagram
    participant P as Parent Agent
    participant DE as Decision Engine
    participant REG as Agent Registry
    participant C as Child Agent Runtime

    P->>REG: list delegatable agents
    P->>DE: choose agent(task, candidates)
    DE-->>P: researcher, 0.91
    P->>C: run(task)
    C-->>P: AgentResult
```

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md)
