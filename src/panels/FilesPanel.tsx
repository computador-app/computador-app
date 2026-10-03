import { useState } from "react";
import { useDomain } from "../domain/context";
import { useText } from "./translations";
export function FilesPanel() {
  const { state, openFile } = useDomain();
  const t = useText();
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const paths = state.files.map((f) => f.path);
  const render = (prefix: string, depth: number) => {
    const names = [
      ...new Set(
        paths
          .filter((p) => p.startsWith(prefix))
          .map((p) => p.slice(prefix.length).split("/")[0]),
      ),
    ];
    return names.map((name) => {
      const path = prefix + name;
      const folder = paths.some((p) => p.startsWith(path + "/"));
      const collapsed = closed.has(path);
      return (
        <div key={path}>
          <button
            className={`file-row ${state.selectedFile === path ? "selected" : ""}`}
            style={{ paddingLeft: 12 + depth * 15 }}
            onClick={() => {
              if (folder)
                setClosed((prev) => {
                  const n = new Set(prev);
                  if (n.has(path)) n.delete(path);
                  else n.add(path);
                  return n;
                });
              else openFile(path);
            }}
            aria-current={
              !folder && state.selectedFile === path ? "true" : undefined
            }
            aria-expanded={folder ? !collapsed : undefined}
          >
            <span className={folder ? "folder-icon" : "file-icon"}>
              {folder
                ? collapsed
                  ? "▸"
                  : "▾"
                : name.endsWith(".php")
                  ? "◇"
                  : name.endsWith(".md")
                    ? "▤"
                    : "{}"}
            </span>
            <span>{name}</span>
          </button>
          {folder && !collapsed && render(path + "/", depth + 1)}
        </div>
      );
    });
  };
  return (
    <div className="panel-body">
      <div className="panel-toolbar">
        <span className="eyebrow">{t.files}</span>
        <span className="subtle-badge">MOCK</span>
      </div>
      <div className="workspace-folder">
        ▾ <strong>{state.workspace.name}</strong>
      </div>
      <div className="file-tree">{render("", 0)}</div>
      <div className="panel-bottom-note">
        {state.files.length} {t.files.toLowerCase()}
      </div>
    </div>
  );
}
