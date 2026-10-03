---
tipo: indice
status: referencia
origem: "harness-architecture.md"
---

# computador-app — documentação

Este cofre é a referência principal de arquitetura e desenvolvimento do computador-app. A base foi aprovada como direção arquitetural em 01/10/2026. **O primeiro frontend mockado está implementado:** veja [escopo e validação](Frontend/Primeira-versao.md). Os contratos, fluxos e exemplos das notas originais também descrevem o backend e comportamentos futuros.

## Entender o produto

1. [Visão e modos de uso](Produto/Visao-e-modos.md).
2. [Princípios e camadas](Architecture/Principios-e-camadas.md).
3. [Session, Task, Execution e AgentRun](Architecture/Entidades-e-lifecycle.md).
4. [Decisões de arquitetura](ADRs/Indice.md).

## Começar a implementação

1. [Como desenvolver](Desenvolvimento/Como-desenvolver.md).
2. [Primeiro milestone](Roadmap/Primeiro-milestone.md) e [fases do MVP](Roadmap/Fases-do-MVP.md).
3. [Contratos](Contratos/Indice.md) e [pendências](Roadmap/Pendencias.md).
4. [Frontend](Frontend/Indice.md), [Backend](Backend/Indice.md) e [testes/fakes](Desenvolvimento/Testes-e-fakes.md).

## Consultar e manter

- [Architecture](Architecture/Indice.md): processos, packages, fluxos e evolução distribuída.
- [Produto](Produto/Indice.md): visão e conceitos do ecossistema.
- [Roadmap](Roadmap/Indice.md): fases, riscos e critérios de aceite.
- [Desenvolvimento](Desenvolvimento/Indice.md): rotina de implementação e manutenção.
- [Templates](Templates/Indice.md): ADR, componente e incremento.
- [Rastreabilidade das 67 seções](Architecture/Rastreabilidade.md).
- [Abrir e manter o cofre](Desenvolvimento/Manutencao-do-cofre.md).

## Como interpretar o conteúdo

Decisões explícitas estão aceitas nos ADRs. Funcionalidades permanecem planejadas até haver código e validação. Recomendações e alternativas estão abertas; execução remota, servidor e sync são futuros e ficam fora do MVP. Blocos TypeScript/YAML/JSON são exemplos conceituais, não APIs executáveis prontas.

O `harness-architecture.md` original permanece como histórico na raiz. Novas decisões e mudanças de arquitetura devem ser registradas aqui, mantendo uma definição canônica por assunto.

---

[Início](Inicio.md)

- [Fase 2 implementada — provedores, sessões e ferramentas](Backend/Fase-2-implementada.md)
