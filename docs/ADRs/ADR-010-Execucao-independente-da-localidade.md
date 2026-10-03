---
tipo: adr
status: aceito
origem: "harness-architecture.md; ADR-010"
---

# ADR-010 — Execucao independente da localidade

**ID:** ADR-010  
**Data de registro:** 2026-10-01  
**Status:** aceita como direção arquitetural; implementação planejada.

## Contexto

Sessões podem originar tarefas executadas em ambientes diferentes.

## Decisão

Depender de ExecutionRuntime, WorkspaceContext e HostRuntime; usar implementação local no MVP.

## Justificativa na fonte

As camadas de domínio não devem assumir que uma execução acontece na máquina do Desktop.

A aplicação deve depender de `ExecutionRuntime`, `WorkspaceContext` e `HostRuntime`, com uma implementação local no MVP e possibilidade de implementação remota futura.

O servidor self-hosted e a sincronização remota **não fazem parte do MVP**; apenas os contratos necessários para evitar acoplamento estrutural à execução local fazem parte dele.

## Consequências

Preparar tasks persistentes e eventos serializáveis; servidor e sync remoto ficam fora do MVP.

## Alternativas e limites

A fonte não apresenta uma comparação completa de alternativas para esta decisão. Não há benchmark ou experimento registrado. Detalhes ainda abertos estão em [Pendências](../Roadmap/Pendencias.md).

## Relações

[Documentação relacionada](../Architecture/Runtime-distribuido.md). Para alterar a decisão, criar um ADR sucessor e marcar este como substituído, preservando seu histórico.

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
