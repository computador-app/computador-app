---
tipo: guia
status: futuro
origem: "harness-architecture.md; seções 65"
---

# Runtime distribuído futuro

O servidor remoto é uma evolução futura. No MVP, preparar contratos e implementar execução local progressivamente; não criar servidor, autenticação remota, containers ou sincronização distribuída para completar o primeiro milestone.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 65. Arquitetura futura de Runtime Distribuído

A arquitetura deve permitir, em uma fase posterior, a criação de uma segunda aplicação open source e self-hosted da mesma família: um **Remote Runtime Server**.

Esse servidor não deve ser tratado como "modo cloud" do Electron. Ele será um produto headless independente, capaz de receber tasks do Desktop e executá-las mesmo quando a máquina do usuário estiver desligada.

### 65.1 Objetivo

Permitir casos como:

- delegar uma tarefa longa para um servidor próprio;
- executar tarefas agendadas ou contínuas sem manter o Desktop ligado;
- rodar agentes em máquinas com mais CPU, RAM ou GPU;
- executar operações dentro de ambientes isolados;
- acompanhar do Desktop tasks que continuam vivas remotamente;
- recuperar resultados, logs e artifacts posteriormente.

Arquitetura conceitual:

```text
Harness Desktop
      │
      │ HTTPS / WebSocket
      ▼
Remote Runtime Server
      │
      ├─ Control Plane
      ├─ Task Queue
      ├─ Agent Runtime
      ├─ Scheduler
      ├─ Remote Secrets Vault
      └─ Execution Environments
             ├─ Container A
             ├─ Container B
             └─ Container C
```

O Desktop permanece como cockpit principal, mas deixa de ser obrigatoriamente o local de execução.

### 65.2 ExecutionRuntime como contrato

O domínio deve depender de uma abstração semelhante a:

```ts
type ExecutionTarget =
  | { type: "local" }
  | { type: "remote"; runtimeId: string }
  | { type: "automatic" };

interface ExecutionRuntime {
  readonly id: string;

  capabilities(): Promise<RuntimeCapabilities>;
  execute(task: TaskDefinition): Promise<TaskHandle>;
  status(taskId: string): Promise<TaskStatus>;
  cancel(taskId: string): Promise<void>;
}
```

No MVP:

```text
ExecutionRuntime
      ↓
LocalExecutionRuntime
```

No futuro:

```text
ExecutionRuntime
   ├─ LocalExecutionRuntime
   └─ RemoteExecutionRuntime
```

A opção `automatic` é uma evolução posterior. Inicialmente, caso existam runtimes remotos, a seleção pode ser explícita pelo usuário.

### 65.3 Modelo de Task persistente

Tasks devem ser entidades persistentes e independentes da sessão e do processo que as iniciou.

Exemplo conceitual:

```ts
interface Task {
  id: string;
  sessionId?: string;
  agentId: string;

  status:
    | "queued"
    | "running"
    | "waiting"
    | "completed"
    | "failed"
    | "cancelled";

  executionTarget: ExecutionTarget;

  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
```

Isso permite que o Desktop seja encerrado enquanto uma Task remota continua viva.

Ao reabrir a aplicação, o cliente apenas sincroniza seu estado com o runtime responsável.

### 65.4 HostRuntime pertence ao ambiente de execução

O `HostRuntime` deve descrever o ambiente onde a task está sendo executada, não necessariamente o computador que abriu a UI.

```text
Tool
 ↓
HostRuntime
 ↓
Execution Environment
 ↓
Windows / macOS / Linux / Linux Container
```

Uma execução remota pode, por exemplo, fornecer:

```json
{
  "runtime": "remote",
  "os": "linux",
  "arch": "x64",
  "workspace": "/workspace/project"
}
```

Tools e extensions devem consumir `context.host` e `context.workspace`, evitando referências diretas ao filesystem ou plataforma do Desktop.

Evitar:

```ts
const cwd = localWorkspacePath;
```

Preferir:

```ts
const cwd = context.workspace.root;
```

### 65.5 Ambientes de execução isolados

O Remote Runtime deve preferencialmente executar tasks em ambientes isolados.

A primeira implementação recomendada é container-based:

```text
Task
 ↓
Remote Agent Runtime
 ↓
Execution Environment
 ↓
Container
 ↓
Tools / Processes / Filesystem
```

Um ambiente poderá declarar recursos e políticas como:

```yaml
runtime: node-22
cpu: 4
memory: 8GB
network: enabled
workspace: /workspace
max_execution_time: 6h
```

A abstração deve permitir outras implementações no futuro sem exigir que o Agent Runtime conheça Docker diretamente.

### 65.6 Sincronização de workspace

Workspace sync é um problema separado de execução remota e não deve ser escondido dentro do Agent Runtime.

Estratégias possíveis:

1. **Git clone/fetch** — preferencial para projetos versionados;
2. **snapshot sob demanda** — envio explícito do estado atual do workspace;
3. **delta sync** — evolução posterior para sincronização incremental.

Primeira UX recomendada quando o Remote Runtime for implementado:

```text
Run remotely

Workspace:
[x] Clone repository
[ ] Upload current workspace snapshot
```

Ao finalizar:

```text
Remote changes available

[View diff]
[Apply to local workspace]
[Create Git branch]
```

Não implementar sincronização bidirecional automática como requisito inicial do servidor.

### 65.7 Secrets remotos

Secrets locais e remotos devem ser cofres independentes.

```text
Desktop Secrets Vault

Remote Secrets Vault
```

Uma definição pode declarar dependências:

```yaml
requires:
  secrets:
    - github_token
    - openai_api_key
```

O runtime verifica se os secrets necessários existem no ambiente selecionado. Credenciais não devem ser copiadas automaticamente do Desktop para o servidor.

### 65.8 Runtime capabilities

Cada runtime pode expor capabilities:

```ts
interface RuntimeCapabilities {
  os: "windows" | "linux" | "macos";
  arch: "x64" | "arm64";
  cpuCount?: number;
  memoryGB?: number;
  gpu?: string | null;
  containers?: boolean;
  network?: boolean;
}
```

Isso abre espaço futuro para múltiplos runtimes registrados:

```text
This Computer
Home Server
VPS
GPU Server
```

O roteamento automático por requisitos é uma evolução e não uma obrigação inicial.

### 65.9 Protocol entre Desktop e Server

Os dois produtos devem compartilhar um protocolo versionado, idealmente em `@harness/protocol`.

Eventos esperados:

```text
task.created
task.queued
task.started
agent.message
tool.started
tool.completed
artifact.created
task.completed
task.failed
task.cancelled
```

O protocolo deve ser transport-agnostic. Uma implementação inicial futura pode usar HTTP para comandos e WebSocket para streaming de eventos.

### 65.10 Família de produtos futura

A arquitetura pode evoluir para:

```text
Harness Desktop
    UI / orchestration / local runtime

Harness Server
    remote runtime / automation / scheduling

Harness CLI
    headless local execution

Harness SDK
    agents / tools / extensions / protocol APIs
```

Com packages compartilhados como:

```text
@harness/core
@harness/agent-runtime
@harness/execution-runtime
@harness/host-runtime
@harness/protocol
@harness/sdk
```

### 65.11 Limites para o MVP atual

O Remote Runtime Server **não faz parte do MVP**.

O MVP deve apenas garantir que as seguintes abstrações não assumam execução local:

```text
Task
ExecutionRuntime
HostRuntime
WorkspaceContext
```

Implementar agora:

- contrato `ExecutionRuntime`;
- `LocalExecutionRuntime`;
- `WorkspaceContext` independente da UI;
- `HostRuntime` injetado pelo ambiente de execução;
- IDs e lifecycle de Task persistentes o suficiente para futura execução assíncrona;
- tipos/eventos serializáveis em um package compartilhado.

Adiar:

- Remote Runtime Server;
- autenticação Desktop ↔ Server;
- task queue distribuída;
- containers remotos;
- sync de workspace;
- secrets remotos;
- scheduling remoto;
- múltiplos workers;
- seleção automática de runtime.

Esse limite preserva o foco frontend-first do MVP sem criar dívida arquitetural que obrigue uma reescrita para suportar execução remota posteriormente.

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md)
