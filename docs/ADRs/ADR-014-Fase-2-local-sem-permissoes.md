---
tipo: adr
status: aceito
origem: "Decisões de implementação da fase 2 — 03/10/2026"
---

# ADR-014 — Fase 2 local e permissões futuras

**Data:** 2026-10-03

**Status:** aceita e implementada nesta fase.

## Decisão

Antecipar integração real pi-ai, sessões SQLite por pasta e loop agêntico local na fase 2. Usar um agente geral com ferramentas de leitura, escrita e shell. Nesta fase, as ferramentas executam sem pedidos de permissão, conforme decisão explícita do usuário. O motor de permissões da arquitetura continua previsto para uma fase futura.

## Consequências

O shell executa com os privilégios do usuário, sem sandbox de sistema operacional. As ferramentas de arquivo validam o limite do workspace. Cancelamento, validação de argumentos e limites de execução permanecem obrigatórios. O ponto central de despacho em `ToolService` é a futura fronteira de políticas.

Não muda a direção dos ADRs de Electron, SQLite ou LLMService. A sequência anterior do roadmap e os exemplos de permissões representam evolução futura, não a política vigente.

[Implementação e testes](../Backend/Fase-2-implementada.md) · [Índice](Indice.md)
