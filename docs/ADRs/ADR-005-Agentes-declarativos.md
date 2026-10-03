---
tipo: adr
status: aceito
origem: "harness-architecture.md; ADR-005"
---

# ADR-005 — Agentes declarativos

**ID:** ADR-005  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Usuários precisam criar agentes sem programação.

## Decisão

Representar agentes como configurações declarativas, sem subclasses por agente.

## Justificativa na fonte

Agentes são configurações, não subclasses concretas.

## Consequências

Resolver políticas e referências por contratos; definir validação e herança antes do runtime real.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Contratos/Dominio.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
