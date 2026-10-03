---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 1, 49, 61, 62, 63"
---

# Visão do produto e modos de uso

O produto é um harness generalista. O uso em programação é uma jornada possível, não um limite de domínio. A UI deverá distinguir respostas inferidas de resultados determinísticos e explicar a origem das operações.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 1. Visão do produto

O objetivo é construir um **harness desktop generalista para agentes**, com experiência visual semelhante a ferramentas como IDEs modernas, mas sem ser limitado a programação.

O produto deve permitir que o usuário:

- converse com um agente generalista ou inicie uma sessão diretamente com qualquer agente;
- crie agentes próprios por configuração, sem precisar programar;
- defina provider, modelo, system prompt, tools, skills, permissões e regras de delegação;
- tenha agentes globais, agentes específicos por projeto e agentes vindos de extensões;
- permita que agentes deleguem tarefas para outros agentes;
- utilize modelos especializados em decisão para roteamento de agentes, modelos e tools;
- use tools determinísticas implementadas como extensões executáveis;
- opere em Windows, Linux e macOS com uma camada de abstração de host;
- tenha uma interface com painéis reposicionáveis, layouts salvos e visão clara das execuções dos agentes;
- trabalhe tanto em modo "projeto", associado a uma pasta, quanto em modo pessoal/global;
- execute modelos locais e remotos por meio de uma camada uniforme de providers.

A arquitetura deve privilegiar:

- extensibilidade;
- isolamento;
- observabilidade;
- segurança;
- testabilidade;
- baixo acoplamento entre UI, runtime, providers e extensões;
- configuração declarativa;
- versionamento opcional de configurações por projeto.

---

## 49. Modo projeto vs modo pessoal

### Modo pessoal

Sem workspace aberto.

Disponível:

- agentes globais;
- sessions globais;
- tools não dependentes de projeto;
- memória global.

### Modo projeto

Workspace ativo.

Além do modo pessoal:

- project agents;
- project skills;
- project rules;
- workspace filesystem;
- project memory;
- project layouts.

---

## 61. UX para execução determinística

A interface pode indicar a origem de uma resposta:

```text
Assistant
Resultado calculado.

Executed tool: example.calculate
Duration: 3ms
```

Isso reforça transparência entre inferência e execução determinística.

---

## 62. Tipos de componentes do ecossistema

| Tipo | Executável | Pode acessar Host API | Pode registrar UI | Pode ser selecionado como agente |
|---|---:|---:|---:|---:|
| Agent | Não diretamente | Via tools | Não | Sim |
| Skill | Não | Não | Não | Não |
| Tool | Sim | Sim, conforme permissão | Não | Não |
| Extension | Sim | Sim, conforme permissão | Sim | Pode registrar agentes |
| Model Provider | Sim | Rede/processo conforme implementação | Config UI opcional | Não |
| Decision Provider | Sim | Conforme implementação | Config UI opcional | Não |
| Panel | UI | Não diretamente | Sim | Não |

---

## 63. Separação entre comando e inferência

Sempre que uma tarefa puder ser determinística, preferir tool.

```text
LLM
 ↓
Intent
 ↓
Tool
 ↓
Deterministic execution
 ↓
Result
```

Não usar LLM para:

- somar valores;
- converter formatos;
- executar transformações determinísticas;
- consultar estado local que uma tool pode retornar;
- executar regras fixas.

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md)
