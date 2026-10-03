---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 5, 56, 57, 58, 59"
---

# Configuração e workspaces

Precedência de configuração e resolução de agentes são regras diferentes. Os exemplos JSON/YAML e .myharness são conceituais; formato definitivo, diretório de produto e semântica de merge ainda precisam de decisão. Aliases de secrets nunca devem conter valores de credenciais.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 5. Workspace e escopos de configuração

O harness deve possuir pelo menos três níveis de configuração:

```text
Global/User
   ↓
Workspace/Project
   ↓
Session
```

### 5.1 Configuração global

Exemplo conceitual:

```text
~/.myharness/
├─ config.json
├─ agents/
├─ skills/
├─ extensions/
├─ layouts/
├─ cache/
└─ logs/
```

Nunca armazenar secrets em arquivos versionáveis.

---

### 5.2 Configuração por projeto

Dentro do projeto:

```text
project-root/
├─ .myharness/
│  ├─ config.json
│  ├─ agents/
│  ├─ skills/
│  ├─ rules/
│  ├─ layouts/
│  └─ extensions/
├─ src/
└─ ...
```

Essa pasta pode ou não ser versionada.

A decisão deve ser do usuário.

---

### 5.3 Merge de configuração

Ordem de precedência:

```text
Built-in defaults
   ↓
User config
   ↓
Project config
   ↓
Session override
```

Um agente de projeto pode:

- sobrescrever um agente global;
- estender um agente global;
- adicionar instruções de projeto;
- restringir tools;
- alterar modelo;
- alterar permissões.

Exemplo:

```text
Global: Software Architect
  prompt: princípios gerais
  tools: files, web

Project override:
  appendPrompt: este projeto usa Laravel, React e PostgreSQL
  tools: files, web, git
```

---

## 56. Esquema mínimo de diretórios do projeto

```text
.myharness/
├─ config.yaml
├─ agents/
│  ├─ architect.yaml
│  └─ researcher.yaml
├─ skills/
│  └─ architecture-review.md
├─ rules/
│  └─ project.md
├─ layouts/
│  └─ coding.json
└─ extensions/
   └─ local-extension/
```

---

## 57. Exemplo de configuração global

```yaml
defaultAgent: general

routing:
  mode: automatic
  autoThreshold: 0.85
  suggestThreshold: 0.60

runtime:
  maxAgentDepth: 3
  maxConcurrentAgents: 4
  maxRunsPerSession: 25

models:
  defaultProvider: openai
```

---

## 58. Exemplo de agente global

```yaml
id: general
name: General Assistant
scope: user

routing:
  description: Assistente generalista para tarefas diversas.

model:
  policy: automatic

prompt:
  user_instructions: |
    Você é um assistente generalista.

tools:
  - web.search
  - files.read
  - files.write

delegation:
  can_receive: true
  can_delegate: true
```

---

## 59. Exemplo de agente de projeto

```yaml
id: software-architect
name: Software Architect
scope: workspace
extends: user:software-architect

routing:
  description: Especialista em arquitetura deste projeto.

prompt:
  append: |
    Este projeto utiliza Electron, React, TypeScript e SQLite.
    Priorize baixo acoplamento e extensibilidade.

tools:
  add:
    - git.diff
    - shell.execute
```

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Indice](../Contratos/Indice.md)
