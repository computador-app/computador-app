# Guia para agentes

## Escopo do projeto

Este repositório contém um aplicativo desktop Electron com frontend React/Vite e backend TypeScript. O processo principal e o preload ficam em `electron/`, o backend em `backend/`, a interface em `src/` e os testes em `tests/`.

## Comandos obrigatórios

- Instale dependências reproduzíveis com `npm ci`.
- Use Node.js 22.22.2 ou mais recente dentro da linha 22.
- Rode `npm run check` para validar tipos, build, testes unitários e E2E de navegador.
- Em Linux/CI, rode os testes Electron com `xvfb-run --auto-servernum npm run test:electron`; em uma sessão gráfica local, use `npm run test:electron`.
- Use `npm run package` para conferir o app descompactado da plataforma atual e `npm run dist` para gerar seu instalador.

## CI e distribuição

- Mantenha o workflow de PR sem secrets e compatível com contribuições vindas de forks.
- A versão da tag da GitHub Release deve coincidir com `package.json`; aceite o prefixo opcional `v`.
- Preserve os alvos de distribuição: Windows x64/NSIS, macOS ARM64 e x64/DMG, Linux x64/DEB e RPM.
- Nunca versione `dist/`, `dist-electron/`, `release/`, resultados de testes, certificados ou credenciais de assinatura.
- Os jobs de empacotamento devem terminar antes que qualquer binário seja anexado à Release, evitando publicações parciais.

## Convenções de mudança

- Preserve o isolamento do renderer (`contextIsolation`, sandbox e ausência de `nodeIntegration`).
- Não introduza dependência de chaves ou contas externas nos testes.
- Ao alterar a versão, use `npm version --no-git-tag-version <versão>` para manter `package.json` e `package-lock.json` sincronizados.
- Atualize o README quando comandos, requisitos, artefatos ou secrets de release mudarem.
