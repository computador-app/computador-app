import { useState, useSyncExternalStore } from "react";
import { extensions, extensionLoadErrors } from "../extensions/bundles";
import { useI18n } from "../i18n";
import { panelTitle } from "../panels-sdk/types";
import { Modal } from "./Modal";
export function Extensions({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();
  const records = useSyncExternalStore(extensions.subscribe, extensions.list);
  const [error, setError] = useState("");
  return (
    <Modal title={t("extensions")} onClose={onClose}>
      <p className="muted">{t("extensionsHint")}</p>
      <div className="extension-list">
        {records.map((record) => (
          <article className="extension-card" key={record.manifest.id}>
            <h3>{panelTitle(record.manifest.name, locale)}</h3>
            <small>
              {record.manifest.id} · v{record.manifest.version} · SDK{" "}
              {record.manifest.apiVersion}
            </small>
            <p>
              {record.manifest.panels
                .map((panel) => panelTitle(panel.title, locale))
                .join(", ")}
            </p>
            <p className="muted">
              {t("extensionPermissions")}:{" "}
              {record.manifest.permissions.join(", ") || t("none")}
            </p>
            <button
              onClick={() => {
                try {
                  setError("");
                  if (record.enabled) extensions.disable(record.manifest.id);
                  else extensions.enable(record.manifest.id);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Error");
                }
              }}
            >
              {t(record.enabled ? "disableExtension" : "enableExtension")}
            </button>
          </article>
        ))}
      </div>
      {[...extensionLoadErrors, error].filter(Boolean).map((error, index) => (
        <p className="extension-error" role="alert" key={index}>
          {error}
        </p>
      ))}
    </Modal>
  );
}
