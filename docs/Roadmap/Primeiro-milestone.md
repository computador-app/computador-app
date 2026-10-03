---
tipo: guia
status: planejado
origem: "harness-architecture.md"
---

# Primeiro milestone: experiência visual mockada

> **Incremento de 02/10/2026:** o frontend mockado foi implementado com persistência somente visual, conforme decisão confirmada pelo usuário. Sessões não são persistidas nesta versão; os critérios abaixo são o planejamento original. Consulte [entrega e validação](../Frontend/Primeira-versao.md).

## Objetivo

Validar a experiência desktop modular antes de conectar um LLM real. Este milestone cobre as fases 1 e 2; nenhuma dessas funcionalidades está implementada no repositório na criação do cofre.

## Critérios de aceite

- [ ] Abrir um workspace e apresentar seu contexto nos painéis.
- [ ] Abrir, fechar e reposicionar painéis registrados pelo PanelRegistry.
- [ ] Criar e editar um agente global ou de projeto por configuração.
- [ ] Selecionar provider e modelo fornecidos por MockLLMService.
- [ ] Criar uma sessão com o agente escolhido como root agent.
- [ ] Enviar mensagem e observar streaming simulado.
- [ ] Ver tool call simulada com origem identificável.
- [ ] Ver uma delegação simulada e o resultado do agente filho.
- [ ] Mostrar execução, espera, conclusão e falha em cenários determinísticos.
- [ ] Demonstrar solicitação simulada de permissão.
- [ ] Fechar e reabrir o app preservando layout e sessões persistidas, conforme a fase 2.
- [ ] Consumir contratos de aplicação sem acoplar painéis às classes mockadas.

O contrato de persistência inicial deve especificar exatamente quais dados são restaurados. Não prometer retomada de processos ou de runs em andamento ao reiniciar o aplicativo.

## Evidência esperada

Executar uma jornada E2E com serviços fake, verificar restauração após restart e mostrar que trocar a implementação de um serviço não muda seus painéis consumidores. Esses testes serão escritos com a aplicação; não há evidência de execução ainda.

LLM real, shell real, multi-agent real, extensões de terceiros e servidor remoto não são necessários para concluir este milestone.

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Fases do MVP](Fases-do-MVP.md) · [Testes e fakes](../Desenvolvimento/Testes-e-fakes.md)
