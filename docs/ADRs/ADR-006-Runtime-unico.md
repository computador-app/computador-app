---
tipo: adr
status: aceito
origem: "harness-architecture.md; ADR-006"
---

# ADR-006 — Runtime unico

**ID:** ADR-006  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Agentes diferentes precisam compartilhar invariantes de execução.

## Decisão

Executar todos os agentes pelo mesmo contrato AgentRuntime.

## Justificativa na fonte

Todo agente executa no mesmo `AgentRuntime`.

## Consequências

Variar configuração, contexto e políticas; cada execução continua sendo um run independente.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Backend/Agentes-e-execucao.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
