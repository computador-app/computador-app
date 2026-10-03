---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 18"
---

# Host Runtime multiplataforma

O host representa o ambiente de execução. Tools devem consumir capacidades injetadas, não caminhos ou plataforma do renderer. Preferir executável e argumentos estruturados; usar shell somente quando necessário e com política explícita.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 18. Host Runtime

Camada responsável por abstrair o sistema operacional.

```ts
interface HostRuntime {
  platform: PlatformApi;
  filesystem: FilesystemApi;
  paths: PathApi;
  process: ProcessApi;
  shell: ShellApi;
  environment: EnvironmentApi;
  capabilities: HostCapabilities;
}
```

---

### 18.1 Platform API

```ts
interface PlatformInfo {
  os: 'windows' | 'linux' | 'macos';
  arch: 'x64' | 'arm64';
  homeDir: string;
  tempDir: string;
}
```

---

### 18.2 Shell Registry

Não assumir um shell por sistema operacional.

```text
Windows
 ├─ PowerShell
 ├─ CMD
 ├─ Git Bash
 └─ WSL

macOS
 ├─ zsh
 ├─ bash
 └─ fish

Linux
 ├─ bash
 ├─ zsh
 └─ fish
```

API:

```ts
interface ShellProvider {
  id: string;
  executable: string;
  available(): Promise<boolean>;
  execute(request: ShellRequest): Promise<ShellResult>;
}
```

---

### 18.3 Preferir spawn sem shell

Quando possível:

```ts
process.spawn('git', ['status'])
```

em vez de:

```text
shell.execute('git status')
```

Benefícios:

- segurança;
- escaping consistente;
- portabilidade;
- testabilidade.

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Indice](../Contratos/Indice.md)
