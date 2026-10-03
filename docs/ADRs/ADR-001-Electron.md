---
tipo: adr
status: aceito
origem: "harness-architecture.md; ADR-001"
---

# ADR-001 — Electron

**ID:** ADR-001  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Aplicação desktop multiplataforma precisa de integração com o SO e ecossistema de UI.

## Decisão

Usar Electron como shell desktop.

## Justificativa na fonte

**Decisão:** usar Electron como shell desktop.

**Motivos:**

- ecossistema maduro;
- acesso robusto ao SO;
- compatibilidade multiplataforma;
- liberdade total de frontend;
- facilidade de integração com Node;
- bom encaixe com extensões TypeScript.

## Consequências

Separar Main, preload e renderer; centralizar privilégios fora da UI.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Architecture/Processos-e-packages.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
