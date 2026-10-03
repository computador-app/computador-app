---
tipo: adr
status: aceito
origem: "harness-architecture.md; ADR-008"
---

# ADR-008 — Host Runtime

**ID:** ADR-008  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Tools precisam funcionar em diferentes plataformas e ambientes.

## Decisão

Abstrair o SO por Host Runtime e capacidades.

## Justificativa na fonte

Nenhuma extensão deve depender diretamente do SO.

## Consequências

Injetar host e workspace do ambiente; evitar platform checks e caminhos locais espalhados.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Backend/Host-runtime.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
