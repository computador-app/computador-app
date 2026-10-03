---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 4, 42, 43"
---

# Processos e packages

A estrutura de monorepo é sugerida e ainda não existe. Main, preload e renderer são fronteiras de privilégio; packages representam responsabilidades, não uma obrigação de criar todos antes da primeira entrega. A descrição original de model-provider-sdk deverá ser reconciliada com a decisão de delegar integração de providers ao pi-ai.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 4. Processos do Electron

A aplicação deve respeitar a separação de processos do Electron.

### 4.1 Main Process

Responsabilidades:

- bootstrap da aplicação;
- criação e ciclo de vida das janelas;
- Host Runtime;
- filesystem;
- processos externos;
- armazenamento seguro de credenciais;
- banco local;
- runtime de agentes;
- runtime de tools e extensões;
- providers;
- IPC seguro com o renderer.

O Main Process é a camada privilegiada da aplicação.

---

### 4.2 Preload

O preload deve expor uma API mínima e tipada ao renderer.

Nunca expor diretamente:

- `fs`;
- `child_process`;
- `process`;
- `ipcRenderer` genérico;
- módulos Node arbitrários.

Exemplo:

```ts
contextBridge.exposeInMainWorld('harness', {
  sessions: sessionApi,
  agents: agentApi,
  workspace: workspaceApi,
  layout: layoutApi,
  runtime: runtimeApi,
});
```

---

### 4.3 Renderer

Stack recomendada:

- React;
- TypeScript;
- Vite;
- Dockview ou biblioteca equivalente para docking;
- Zustand para estado de UI;
- TanStack Query para estado assíncrono;
- componentes próprios + biblioteca headless;
- CSS utility-first ou CSS Modules conforme preferência.

Responsabilidades:

- UI;
- layouts;
- interação;
- renderização de sessões;
- painel de agentes;
- painel de runs;
- configurações;
- gerenciamento visual de extensões;
- logs e diagnostics.

O renderer não deve conter lógica privilegiada de SO ou execução de processos.

---

## 42. Estrutura sugerida de monorepo

```text
/apps
  /desktop
    /main
    /preload
    /renderer

/packages
  /agent-runtime
  /conversation-runtime
  /execution-runtime
  /protocol
  /decision-engine
  /model-provider-sdk
  /tool-runtime
  /extension-sdk
  /host-runtime
  /permission-engine
  /persistence
  /event-bus
  /shared-types
  /ui-kit
  /config

/extensions
  /builtin-files
  /builtin-shell
  /builtin-web
  /builtin-git

/docs
```

---

## 43. Responsabilidades por package

### agent-runtime

- loop agêntico;
- tool calling;
- delegação;
- model resolution;
- context building.

### execution-runtime

- contrato `ExecutionRuntime`;
- criação e acompanhamento de execuções;
- resolução de target local/remoto;
- cancelamento, status e lifecycle;
- abstração de workspace por ambiente de execução.

No MVP, a única implementação obrigatória é `LocalExecutionRuntime`.

### protocol

- DTOs compartilhados entre interfaces e runtimes;
- eventos de lifecycle de tasks e execuções;
- contratos serializáveis para futura comunicação Desktop ↔ Server;
- versionamento de protocolo.

### decision-engine

- roteamento;
- providers de decisão;
- policies de confiança.

### model-provider-sdk

- contrato dos providers;
- schemas comuns;
- capability metadata.

### tool-runtime

- registro;
- execução;
- permission checks;
- tracing.

### host-runtime

- SO;
- filesystem;
- process;
- shell;
- paths;
- environment;
- capabilities do ambiente onde a execução realmente ocorre.

O `HostRuntime` não representa necessariamente a máquina onde o Electron está aberto. Ele representa o **host do ExecutionRuntime atual**. Isso permite que, no futuro, um agente iniciado no Desktop execute dentro de um container Linux remoto sem alterar as tools.

### extension-sdk

- manifest;
- ExtensionContext;
- APIs públicas;
- compatibility layer.

### permission-engine

- políticas;
- prompts de consentimento;
- audit log.

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md)
