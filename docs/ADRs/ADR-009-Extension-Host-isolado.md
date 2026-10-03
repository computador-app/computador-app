---
tipo: adr
status: aceito
origem: "harness-architecture.md; ADR-009"
---

# ADR-009 — Extension Host isolado

**ID:** ADR-009  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Código de terceiros pode falhar ou agir fora das permissões.

## Decisão

Executar extensões fora do Main em um Extension Host isolado.

## Justificativa na fonte

Código de terceiros não deve rodar diretamente no Main Process.

## Consequências

Definir IPC, limites e encerramento; mecanismo de isolamento permanece pendente.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Backend/Tools-skills-e-extensoes.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
