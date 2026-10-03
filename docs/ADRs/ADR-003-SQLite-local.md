---
tipo: adr
status: aceito
origem: "harness-architecture.md; ADR-003"
---

# ADR-003 — SQLite local

**ID:** ADR-003  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Estado estruturado deve persistir sem infraestrutura externa.

## Decisão

Usar SQLite como persistência primária local.

## Justificativa na fonte

**Decisão:** SQLite para persistência primária local.

**Motivos:**

- zero infraestrutura;
- transações;
- queries simples;
- portabilidade;
- bom suporte em desktop.

## Consequências

Planejar transações e migrations; driver e schema físico permanecem pendentes.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Backend/Persistencia-e-observabilidade.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
