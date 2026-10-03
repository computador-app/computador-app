---
tipo: adr
status: aceito
origem: "harness-architecture.md; atualização frontend-first de 01/10/2026"
---

# ADR-013 — LLMService e pi ai

**ID:** ADR-013  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Diferenças de providers não devem se espalhar pela UI e pelo runtime.

## Decisão

Delegar integração de LLM ao pi-ai através da fachada própria LLMService.

## Justificativa na fonte

Fonte: seções 11 e 12.

## Consequências

Somente PiAILLMService conhece a biblioteca; catálogo e streaming passam pela fachada.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Backend/LLMs-e-catalogo.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
