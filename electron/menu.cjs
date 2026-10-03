const labels = {
  en: {
    file: "File",
    open: "Open Folder…",
    recent: "Open Recent",
    demo: "Computador · demo workspace",
    research: "Research · demo workspace",
    newSession: "New Chat",
    preferences: "Preferences…",
    close: "Close Window",
    quit: "Quit",
    edit: "Edit",
    undo: "Undo",
    redo: "Redo",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    selectAll: "Select All",
    view: "View",
    panels: "Panels",
    extensions: "Extensions…",
    chat: "Chat",
    terminal: "Terminal",
    sessions: "Chat Sessions",
    files: "File Explorer",
    viewer: "File Viewer",
    markdown: "Markdown Preview",
    agents: "Agents",
    activity: "Activity",
    layouts: "Layouts",
    default: "Default",
    focus: "Focus",
    review: "Review",
    save: "Save Current Layout",
    restore: "Restore Saved Layout",
    fullscreen: "Toggle Full Screen",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    resetZoom: "Actual Size",
    window: "Window",
    minimize: "Minimize",
    zoom: "Zoom",
    help: "Help",
    about: "About Computador",
    services: "Services",
    hide: "Hide Computador",
    hideOthers: "Hide Others",
    unhide: "Show All",
    front: "Bring All to Front",
  },
  pt: {
    file: "Arquivo",
    open: "Abrir pasta…",
    recent: "Abrir recentes",
    demo: "Computador · pasta de demonstração",
    research: "Pesquisa · pasta de demonstração",
    newSession: "Novo chat",
    preferences: "Preferências…",
    close: "Fechar janela",
    quit: "Sair",
    edit: "Editar",
    undo: "Desfazer",
    redo: "Refazer",
    cut: "Recortar",
    copy: "Copiar",
    paste: "Colar",
    selectAll: "Selecionar tudo",
    view: "Exibir",
    panels: "Painéis",
    extensions: "Extensões…",
    chat: "Chat",
    terminal: "Terminal",
    sessions: "Sessões de chat",
    files: "Árvore de arquivos",
    viewer: "Visualizador de arquivo",
    markdown: "Prévia de Markdown",
    agents: "Agentes",
    activity: "Atividade",
    layouts: "Layouts",
    default: "Padrão",
    focus: "Foco",
    review: "Revisão",
    save: "Salvar layout atual",
    restore: "Restaurar layout salvo",
    fullscreen: "Alternar tela cheia",
    zoomIn: "Ampliar",
    zoomOut: "Reduzir",
    resetZoom: "Tamanho real",
    window: "Janela",
    minimize: "Minimizar",
    zoom: "Zoom",
    help: "Ajuda",
    about: "Sobre o Computador",
    services: "Serviços",
    hide: "Ocultar Computador",
    hideOthers: "Ocultar outros",
    unhide: "Mostrar todos",
    front: "Trazer todas para frente",
  },
};

function validatePanels(items) {
  if (!Array.isArray(items) || items.length > 64) return false;
  const ids = new Set();
  return items.every((item) => {
    if (!item || typeof item !== "object" ||
        typeof item.id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(item.id) ||
        typeof item.title !== "string" || item.title.trim().length === 0 || item.title.length > 100 ||
        /[\x00-\x1f\x7f]/.test(item.title) || typeof item.multiple !== "boolean" || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}

function createMenuTemplate(locale, dispatch, platform = process.platform, panels) {
  const t = labels[locale === "pt-BR" ? "pt" : locale] || labels.en;
  const command = (label, id, accelerator) => ({
    id,
    label,
    ...(accelerator ? { accelerator } : {}),
    click: () => dispatch(id),
  });
  const role = (id) => ({ label: t[id], role: id });
  const separator = { type: "separator" };
  const preferences = command(t.preferences, "preferences.open", "CmdOrCtrl+,");
  return [
    ...(platform === "darwin"
      ? [
          {
            label: "Computador",
            submenu: [
              role("about"),
              separator,
              preferences,
              separator,
              { ...role("services"), submenu: [] },
              separator,
              role("hide"),
              role("hideOthers"),
              role("unhide"),
              separator,
              role("quit"),
            ],
          },
        ]
      : []),
    {
      label: t.file,
      submenu: [
        command(t.newSession, "session.new", "CmdOrCtrl+N"),
        command(t.open, "workspace.open", "CmdOrCtrl+O"),
        {
          label: t.recent,
          submenu: [
            command(t.demo, "workspace.recent.demo"),
            command(t.research, "workspace.recent.research"),
          ],
        },
        separator,
        ...(platform !== "darwin" ? [preferences, separator] : []),
        role("close"),
        ...(platform !== "darwin" ? [role("quit")] : []),
      ],
    },
    {
      label: t.edit,
      submenu: [
        role("undo"),
        role("redo"),
        separator,
        role("cut"),
        role("copy"),
        role("paste"),
        role("selectAll"),
      ],
    },
    {
      label: t.view,
      submenu: [
        {
          label: t.panels,
          submenu: (panels === undefined ? [
            "chat", "sessions", "files", "viewer", "markdown", "agents", "activity", "terminal",
          ].map((id) => ({ id, title: t[id], multiple: false })) : validatePanels(panels) ? panels : [])
            .map(({ id, title }) => command(title.replace(/&/g, "&&"), `panel.${id}`)),
        },
        {
          label: t.layouts,
          submenu: [
            ...["default", "focus", "review"].map((id) =>
              command(t[id], `layout.${id}`),
            ),
            separator,
            command(t.save, "layout.save"),
            command(t.restore, "layout.restore"),
          ],
        },
        command(t.extensions, "extensions.open"),
        separator,
        role("resetZoom"),
        role("zoomIn"),
        role("zoomOut"),
        separator,
        { label: t.fullscreen, role: "togglefullscreen" },
      ],
    },
    {
      label: t.window,
      submenu: [
        role("minimize"),
        role("zoom"),
        ...(platform === "darwin" ? [separator, role("front")] : []),
      ],
    },
    { label: t.help, submenu: [role("about")] },
  ];
}

module.exports = { createMenuTemplate, validatePanels };
