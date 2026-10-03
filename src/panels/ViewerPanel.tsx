import { useEffect, useState } from "react";
import { useDomain } from "../domain/context";
import { useText } from "./translations";
export function ViewerPanel() {
  const { state, openFile, locale } = useDomain();
  const t = useText();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const file = state.files.find((f) => f.path === state.selectedFile);
  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [file?.path]);
  if (!file) return <div className="empty-note">{t.selectFile}</div>;
  return (
    <div className="viewer-panel">
      <div className="file-breadcrumb">
        <span>{file.path}</span>
        <button
          className="small-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(file.content);
              setCopied(true);
              setCopyError(false);
            } catch {
              setCopyError(true);
            }
          }}
        >
          {copied ? t.copied : t.copy}
        </button>
        {file.language === "markdown" && (
          <button
            className="small-button"
            aria-label={t.preview}
            onClick={() => openFile(file.path)}
          >
            ◫
          </button>
        )}
      </div>
      {copyError && (
        <div role="alert" className="empty-note">
          {t.copy}: {copyErrorMessage(t.copy)}
        </div>
      )}
      <div className="code-view">
        {file.content.split("\n").map((line, i) => (
          <div className="code-line" key={i}>
            <span className="line-number">{i + 1}</span>
            <code
              className={
                /^\s*(use|namespace|class|final|public|private|return|\<\?php)/.test(
                  line,
                )
                  ? "code-keyword"
                  : ""
              }
            >
              {line || " "}
            </code>
          </div>
        ))}
      </div>
      <div className="viewer-status">
        <span>{file.language.toUpperCase()}</span>
        <span>
          {file.content.split("\n").length} {t.lines} · UTF-8
        </span>
        <span>
          {state.live
            ? locale === "en"
              ? "Read-only"
              : "Somente leitura"
            : t.readonly}
        </span>
      </div>
    </div>
  );
}
function copyErrorMessage(copy: string) {
  return copy === "Copiar"
    ? "acesso à área de transferência indisponível"
    : "clipboard access unavailable";
}
