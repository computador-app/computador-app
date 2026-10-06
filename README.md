# computador-app

Harness desktop para agentes com Electron, React e TypeScript. Integra provedores via pi-ai, sessões persistentes por pasta e um loop agêntico com ferramentas locais. A prévia de navegador continua disponível com dados simulados.

A referência mantida está no [cofre de documentação](docs/Inicio.md). Para usar no Obsidian, abra a pasta `docs/` como cofre e comece por `Inicio.md`. Não são necessários plugins externos.

- [Primeiro milestone](docs/Roadmap/Primeiro-milestone.md)
- [Decisões de arquitetura](docs/ADRs/Indice.md)
- [Guia de desenvolvimento](docs/Desenvolvimento/Como-desenvolver.md)
- [Pendências técnicas](docs/Roadmap/Pendencias.md)

O [harness-architecture.md](harness-architecture.md) permanece preservado como histórico da proposta original. Novas decisões e atualizações devem ser feitas em `docs/`.


## Executar

Requer Node.js 22.22.2+ e npm. Em Linux, Electron precisa de uma sessão gráfica e das bibliotecas do sistema para Chromium.

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
npm run package
npm run test:packaged
```

`check` executa TypeScript, build, cobertura unitária do frontend e backend e E2E de navegador. A cobertura é uma barreira do CI: o frontend exige no mínimo 33% de linhas/statements, 23% de branches e 28% de functions; o backend exige 80% de linhas e 70% de branches/functions. O relatório HTML do frontend fica em `coverage/frontend/` e é publicado como artefato do workflow.

Os E2E de navegador incluem regressão visual do catálogo de modelos nos temas escuro e claro. Para aceitar uma alteração visual intencional, revise os diffs e execute `npm run test:e2e -- --update-snapshots`; os PNGs de referência em `tests/visual.spec.ts-snapshots/` devem ser versionados.

Os testes de Electron ficam separados por responsabilidade em `tests-electron/` e precisam de ambiente gráfico (ou Xvfb no CI). Eles validam isolamento, menus, clipboard, agentes, persistência, provedores, modelos, imagens, ferramentas e cancelamento com backend falso determinístico. Não exigem chaves nem contas externas. Depois de `npm run package` ou `npm run dist`, `npm run test:packaged` abre o executável gerado e confere inicialização, janela e versão.

Detalhes de arquitetura, contratos e limites: [Primeira versão do frontend](docs/Frontend/Primeira-versao.md).

## CI e releases

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda a cada abertura, reabertura ou atualização de um pull request. Ele executa o build, a checagem de tipos, os testes com limites de cobertura, os E2E (incluindo snapshots visuais) e os testes de integração do Electron em uma sessão Xvfb. O relatório de cobertura é guardado mesmo quando um teste falha.

Ao publicar uma GitHub Release, [`.github/workflows/release.yml`](.github/workflows/release.yml) gera e anexa automaticamente:

- instalador NSIS para Windows x64 (`.exe`);
- imagens para macOS ARM64 e Intel x64 (`.dmg`);
- pacotes Linux x64 para Debian/Ubuntu (`.deb`) e Fedora/RHEL/openSUSE (`.rpm`).

Cada job abre e valida o aplicativo empacotado antes de disponibilizar o instalador. A publicação só começa depois que Windows, as duas arquiteturas de macOS e Linux passam nesse smoke test, evitando anexar um artefato que foi gerado mas não inicializa.

O workflow aceita qualquer tag de release. Os nomes e a versão interna dos instaladores continuam sendo derivados da versão registrada no `package.json` do commit marcado.

Os artefatos são gerados sem assinatura quando os secrets de certificado não estão configurados. Para assinar e notarizar o macOS, configure `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` e `APPLE_TEAM_ID`. Para assinar o Windows, configure `WIN_CSC_LINK` e `WIN_CSC_KEY_PASSWORD`. Certificados e senhas nunca devem ser adicionados ao repositório.

Para validar o empacotamento localmente, use `npm run package` (diretório descompactado) ou `npm run dist` (instalador da plataforma atual). As saídas ficam em `release/` e não devem ser commitadas.
