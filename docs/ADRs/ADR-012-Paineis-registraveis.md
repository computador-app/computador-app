---
tipo: adr
status: aceito
origem: "harness-architecture.md; atualização frontend-first de 01/10/2026"
---

# ADR-012 — Paineis registraveis

**ID:** ADR-012  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Adicionar painéis não deve exigir alteração estrutural do workspace.

## Decisão

Usar PanelRegistry, PanelDefinition, PanelInstance e layouts serializáveis desde o MVP.

## Justificativa na fonte

Fonte: seção 25.

## Consequências

Separar tipo e instância; comunicar por comandos e eventos; contribuições externas são futuras.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Frontend/Paineis-e-layouts.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
