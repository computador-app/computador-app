import { SafeMarkdown } from "./SafeMarkdown";
import { useDomain } from "../domain/context";
import { useText } from "./translations";
export function MarkdownPanel() {
  const { state } = useDomain();
  const t = useText();
  const file = state.files.find((f) => f.path === state.selectedMarkdown);
  if (file?.language !== "markdown")
    return (
      <div className="preview-empty">
        <span>▤</span>
        <p>{t.noMarkdown}</p>
      </div>
    );
  return (
    <div className="markdown-preview">
      <div className="file-breadcrumb">
        {file.path}
        <span className="subtle-badge">MARKDOWN</span>
      </div>
      <article className="markdown-body markdown-document">
        <SafeMarkdown>{file.content}</SafeMarkdown>
      </article>
    </div>
  );
}
