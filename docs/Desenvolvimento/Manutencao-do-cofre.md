---
tipo: guia
status: planejado
origem: "harness-architecture.md"
---

# Manutenção e uso do cofre

## Abrir no Obsidian

Escolher “Abrir pasta como cofre” e selecionar `docs/`. Abrir `Inicio.md`. Os links são Markdown relativos, sem plugins externos, e também funcionam na navegação do repositório. O cofre usa Mermaid para diagramas e o plugin nativo Templates com a pasta `Templates`.

## Autoridade e histórico

`docs/` é a referência mantida. O arquivo original na raiz é o histórico de origem; não sincronizar duas cópias da arquitetura. O mapa de rastreabilidade identifica o destino de cada seção. Conteúdo extraído foi preservado como referência conceitual, com orientações e pendências adicionais.

## Atualizar notas

Manter uma definição canônica por assunto e criar links para ela. Atualizar índices e rastreabilidade quando mover conteúdo. Cada nota tem `tipo`, `status` e `origem`; estados usados incluem `planejado`, `aceito`, `pendente`, `futuro`, `referencia` e `template`. Estado de decisão e estado de implementação são dimensões distintas: ADR aceito não prova entrega de código.

Criar um ADR sucessor para mudar decisão arquitetural; preservar o anterior e indicar substituição. Para funcionalidade implementada, adicionar referência ao código e evidência de teste antes de alterar o status da respectiva documentação. Não marcar uma nota ampla inteira como implementada quando apenas parte do conteúdo foi entregue.

## Configuração portátil

Versionar somente ajustes mínimos de `app.json`, `core-plugins.json` e `templates.json`. O ignore exclui estado pessoal de janelas, cache, plugins externos e CSS pessoal. Não armazenar credenciais no cofre.

## Revisão de documentação

Verificar existência dos destinos dos links, integridade de blocos de código e JSON da configuração. Conferir cobertura das 67 seções e IDs únicos dos ADRs. A validação estrutural não equivale a abrir o aplicativo Obsidian nem a testar a futura aplicação desktop.

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Rastreabilidade](../Architecture/Rastreabilidade.md) · [ADR](../Templates/ADR.md)
