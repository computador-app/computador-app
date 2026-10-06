# computador-app

Harness desktop para agentes com Electron, React e TypeScript. Integra provedores via pi-ai, sessões persistentes por pasta e um loop agêntico com ferramentas locais. A prévia de navegador continua disponível com dados simulados.

A referência mantida está no [cofre de documentação](docs/Inicio.md). Para usar no Obsidian, abra a pasta `docs/` como cofre e comece por `Inicio.md`. Não são necessários plugins externos.

- [Primeiro milestone](docs/Roadmap/Primeiro-milestone.md)
- [Decisões de arquitetura](docs/ADRs/Indice.md)
- [Guia de desenvolvimento](docs/Desenvolvimento/Como-desenvolver.md)
- [Pendências técnicas](docs/Roadmap/Pendencias.md)

O [harness-architecture.md](harness-architecture.md) permanece preservado como histórico da proposta original. Novas decisões e atualizações devem ser feitas em `docs/`.


## Executar

Requer Node.js 22.19+ e npm. Em Linux, Electron precisa de uma sessão gráfica e das bibliotecas do sistema para Chromium.

```bash
npm ci
npm run dev:electron
```

No macOS, `dev:electron` e `start` preparam automaticamente um bundle local
chamado **Computador**, usado pelo menu global, Dock e alternador `Command+Tab`.
O bundle fica no cache ignorado de `node_modules` e não altera a instalação do
Electron. Linux e Windows continuam iniciando o executável padrão diretamente.
O ícone-fonte com transparência fica em `assets/computador-icon.png`; a variante
nativa usada pelo bundle do macOS fica em `assets/computador.icns`.

A barra de menu web aparece apenas na prévia do navegador, como alternativa ao menu nativo. No Linux, o app mantém o menu nativo visível na janela e desativa a exportação para o menu global do desktop, evitando que ele desapareça em sessões KDE. Alterações no processo principal exigem fechar e abrir novamente o Electron.

Para abrir somente o frontend no navegador: `npm run dev` e acesse `http://127.0.0.1:5173`.
Para executar o build local no Electron: `npm run build` seguido de `npm start`.

## Nesta versão

- Preferências com abas **Provedores** e **Modelo**: chave de API ou assinatura conforme suporte do SDK, modelo padrão e exclusões para limpar seletores.
- Pastas reais, recentes e conversas persistidas por projeto em SQLite.
- Chat com streaming, cancelamento, recuperação após reinício, resultados de ferramentas e tokens/custo estimado.
- Agentes declarativos em YAML, globais (`~/.computador/agents`) ou de projeto (`.computador/agents`), com editor, modelo/pensamento preferidos e limites de runtime.
- Sessões vinculadas a um snapshot do agente e delegação síncrona por `delegate_task`, incluindo runs persistidos e painel dockável **Subagente**.
- `list_files`, `read_file`, `search_files`, `write_file`, `edit_file` e `run_shell`, sem pedidos de permissão nesta fase.
- Árvore de arquivos real, código e Markdown; painel Terminal com saída dos comandos do agente.
- Docking, layouts, português/inglês, temas e tamanho do texto preservados.

No Electron, abra uma pasta, conecte um provedor em Preferências → Provedores, escolha o padrão em Modelo e crie ou edite perfis em Agentes. Credenciais usam armazenamento criptografado da plataforma; sem ele, duram apenas até fechar o app. O shell executa com os privilégios do usuário, sem sandbox de SO. O motor de permissões será implementado futuramente.

`npm run dev` abre apenas a demonstração de navegador. O backend real é iniciado por `npm run dev:electron` ou `npm start` após build. Mudanças no backend exigem novo build e reinício do Electron.

Detalhes: [Fase 2 implementada](docs/Backend/Fase-2-implementada.md).

## Testes

```bash
npx playwright install chromium
npm run check
npm run test:electron
```

`check` executa TypeScript, build, testes unitários e E2E de navegador. Os testes de Electron precisam de ambiente gráfico (ou Xvfb no CI) e validam isolamento, menus, clipboard e o fluxo completo de chat/provedores com backend falso determinístico. Não exigem chaves nem contas externas.

Detalhes de arquitetura, contratos e limites: [Primeira versão do frontend](docs/Frontend/Primeira-versao.md).
