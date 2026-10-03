# computador-app

Harness desktop generalista para agentes, planejado com Electron, React e TypeScript. A primeira versão do frontend está implementada com serviços mockados em memória e painéis ancoráveis. Apenas layout, aparência e idioma são persistidos.

A referência mantida está no [cofre de documentação](docs/Inicio.md). Para usar no Obsidian, abra a pasta `docs/` como cofre e comece por `Inicio.md`. Não são necessários plugins externos.

- [Primeiro milestone](docs/Roadmap/Primeiro-milestone.md)
- [Decisões de arquitetura](docs/ADRs/Indice.md)
- [Guia de desenvolvimento](docs/Desenvolvimento/Como-desenvolver.md)
- [Pendências técnicas](docs/Roadmap/Pendencias.md)

O [harness-architecture.md](harness-architecture.md) permanece preservado como histórico da proposta original. Novas decisões e atualizações devem ser feitas em `docs/`.


## Executar

Requer Node.js 22.12+ e npm. Em Linux, Electron precisa de uma sessão gráfica e das bibliotecas do sistema para Chromium.

```bash
npm ci
npm run dev:electron
```

A barra de menu web aparece apenas na prévia do navegador, como alternativa ao menu nativo. No Linux, o app mantém o menu nativo visível na janela e desativa a exportação para o menu global do desktop, evitando que ele desapareça em sessões KDE. Alterações no processo principal exigem fechar e abrir novamente o Electron.

Para abrir somente o frontend no navegador: `npm run dev` e acesse `http://127.0.0.1:5173`.
Para executar o build local no Electron: `npm run build` seguido de `npm start`.

## Nesta versão

- Menu exclusivo do sistema no Electron (barra global no macOS; menu nativo da janela em Windows/Linux), com comandos de abrir pastas de demonstração, recentes, edição, exibição e preferências.
- Chat com sessões, streaming mock, cancelamento, permissão e falha simulados.
- Árvore de arquivos mock, visualizador de código e prévia segura de Markdown.
- Terminal ilustrativo; agentes de demonstração selecionáveis no chat.
- Docking nas quatro direções, abas, redimensionamento, presets Padrão/Foco/Revisão e layout salvo.
- Configurações em cinco abas; português/inglês, temas claro/escuro e tamanho do texto.

Abrir pasta seleciona um workspace de exemplo; não lê arquivos reais. Chats, agentes, arquivos e execuções reiniciam ao recarregar. Os controles de modelos e políticas nas configurações são ilustrativos. Não há LLM, terminal, rede ou backend de domínio real.

## Testes

```bash
npx playwright install chromium
npm run check
npm run test:electron
```

`check` executa TypeScript, build, testes unitários e E2E de navegador. O smoke de Electron precisa de ambiente gráfico (ou Xvfb no CI) e valida renderer, isolamento, menu, idioma, preferências e clipboard nativo.

Detalhes de arquitetura, contratos e limites: [Primeira versão do frontend](docs/Frontend/Primeira-versao.md).
