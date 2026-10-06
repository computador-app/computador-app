---
tipo: guia
status: implementado-parcialmente
origem: "harness-architecture.md; seções 26"
---

# Editor de agentes

O editor produz configuração declarativa e permite criar, editar, duplicar e excluir agentes de usuário e projeto. Modelo e pensamento são preferências opcionais; a sessão pode substituí-los.

> **Estado do projeto:** identidade, modelo, prompt e limites de runtime estão implementados. Tools, skills e permissões selecionáveis permanecem futuras.

## Comportamento implementado

- lista agrupada por Usuário e Projeto;
- agente de usuário padrão e última escolha por projeto;
- ID e escopo imutáveis após a criação;
- conflito por revisão ao editar o YAML externamente;
- comentários preservados nas edições de arquivos válidos;
- exclusão recuperável pela lixeira do sistema;
- proteção contra remover o último agente de usuário;
- aviso de que edições não alteram sessões existentes;
- seletor de agente bloqueado após a primeira mensagem;
- painel Subagente com árvore e transcript completo dos runs filhos.

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
