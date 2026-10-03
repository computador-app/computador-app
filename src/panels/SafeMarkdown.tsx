import ReactMarkdown from "react-markdown";
import { useDomain } from "../domain/context";
/** Raw HTML and remote media stay inert; only workspace file links are actionable. */
export function SafeMarkdown({ children }: { children: string }) {
  const { state, openFile, locale } = useDomain();
  return (
    <ReactMarkdown
      skipHtml
      components={{
        img: ({ alt }) => (
          <span className="markdown-image-placeholder">
            [{alt || (locale === "en" ? "Image omitted" : "Imagem omitida")}]
          </span>
        ),
        a: ({ href, children: label }) => {
          const path = href?.replace(/^\.\//, "");
          if (path && state.files.some((file) => file.path === path))
            return (
              <a
                href={path}
                onClick={(event) => {
                  event.preventDefault();
                  openFile(path);
                }}
              >
                {label}
              </a>
            );
          return (
            <span
              className="markdown-inert-link"
              title={`${locale === "en" ? "External link (mock preview)" : "Link externo (prévia mock)"}: ${href || ""}`}
            >
              {label} ↗
            </span>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
