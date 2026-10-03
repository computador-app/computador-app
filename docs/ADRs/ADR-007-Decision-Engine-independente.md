---
tipo: adr
status: aceito
origem: "harness-architecture.md; ADR-007"
---

# ADR-007 — Decision Engine independente

**ID:** ADR-007  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Roteamento envolve decisões classificatórias independentes da identidade dos agentes.

## Decisão

Isolar o Decision Engine dos agentes.

## Justificativa na fonte

Roteamento não deve ficar embutido nos agentes.

## Consequências

Manter decisões testáveis e rastreáveis; sua implementação não bloqueia o MVP visual.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Backend/Decisoes-e-roteamento.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
