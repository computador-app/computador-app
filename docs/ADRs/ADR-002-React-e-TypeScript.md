---
tipo: adr
status: aceito
origem: "harness-architecture.md; ADR-002"
---

# ADR-002 — React e TypeScript

**ID:** ADR-002  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

UI modular precisa de componentes e tipos compartilhados.

## Decisão

Usar React e TypeScript no renderer.

## Justificativa na fonte

**Decisão:** React no renderer.

**Motivos:**

- ecossistema amplo;
- bibliotecas de docking maduras;
- facilidade de criar UI extensível;
- tipagem compartilhada com o runtime.

## Consequências

Manter contratos compartilhados; biblioteca de docking e estilo visual permanecem escolhas abertas.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Frontend/Paineis-e-layouts.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
