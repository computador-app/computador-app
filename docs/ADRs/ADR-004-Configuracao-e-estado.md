---
tipo: adr
status: aceito
origem: "harness-architecture.md; ADR-004"
---

# ADR-004 — Configuracao e estado

**ID:** ADR-004  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Configuração versionável e dados operacionais têm ciclos de vida distintos.

## Decisão

Manter configurações em arquivos e estado operacional em banco.

## Justificativa na fonte

**Arquivos:** configurações versionáveis por usuário/projeto.

**Banco:** sessões, mensagens, runs, traces e estado operacional.

## Consequências

Separar configuração de sessões, mensagens, runs e traces; não versionar secrets.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Backend/Configuracao-e-workspaces.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
