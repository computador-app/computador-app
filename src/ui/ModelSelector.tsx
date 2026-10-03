import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { modelProviders } from "../domain/models";
import type { Locale } from "../i18n";
import "./model-selector.css";

export function ModelSelector({
  value,
  onChange,
  disabled = false,
  label,
  locale,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  label: string;
  locale: Locale;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const submenu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 240,
    height: 360,
  });
  const selectedProvider = modelProviders.find((provider) =>
    provider.models.some((model) => model.id === value),
  );
  const provider = modelProviders.find((provider) => provider.id === active);
  const pt = locale === "pt-BR";
  const close = (restoreFocus = true) => {
    setOpen(false);
    setActive(null);
    if (restoreFocus) trigger.current?.focus();
  };
  const showProvider = (providerId: string, focus = false) => {
    setActive(providerId);
    if (focus)
      requestAnimationFrame(() =>
        submenu.current
          ?.querySelector<HTMLButtonElement>("[role=menuitemradio]")
          ?.focus(),
      );
  };
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(provider ? 500 : 240, window.innerWidth - 16);
      const height = Math.min(360, window.innerHeight - 16);
      const expectedHeight = Math.min(
        height,
        44 + 36 * Math.max(modelProviders.length, provider?.models.length || 0),
      );
      setPosition({
        width,
        height,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: Math.max(
          8,
          Math.min(
            rect.bottom + expectedHeight + 8 > window.innerHeight
              ? rect.top - expectedHeight - 5
              : rect.bottom + 5,
            window.innerHeight - expectedHeight - 8,
          ),
        ),
      });
    };
    place();
    if (popup.current && !popup.current.matches(":popover-open"))
      popup.current.showPopover();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, active]);
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${id}-${selectedProvider?.id || modelProviders[0].id}`)
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        close(false);
    };
    const scroll = (event: Event) => {
      if (!popup.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open]);
  useEffect(() => {
    if (disabled) close(false);
  }, [disabled]);
  const keydown = (event: KeyboardEvent<HTMLDivElement>) => {
    const insideSubmenu = submenu.current?.contains(event.target as Node);
    if (
      event.key === "Escape" ||
      (event.key === "ArrowLeft" && insideSubmenu)
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (active) {
        const previous = active;
        setActive(null);
        document.getElementById(`${id}-${previous}`)?.focus();
      } else close();
    } else if (event.key === "Tab") {
      close();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const menu = (event.target as HTMLElement).closest("[role=menu]");
      const buttons = Array.from(
        menu?.querySelectorAll<HTMLButtonElement>(
          "[role=menuitem],[role=menuitemradio]",
        ) || [],
      );
      const current = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (current +
                (event.key === "ArrowDown" ? 1 : -1) +
                buttons.length) %
              buttons.length;
      buttons[next]?.focus();
    }
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="model-selector"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-providers` : undefined}
        title={value}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{value}</span>
        <ChevronDown size={12} />
      </button>
      {open &&
        createPortal(
          <div
            ref={popup}
            popover="manual"
            className={`model-picker ${provider ? "with-submenu" : ""}`}
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.height,
            }}
            onKeyDown={keydown}
          >
            <div
              className="model-provider-menu"
              role="menu"
              aria-label={pt ? "Provedores" : "Providers"}
              id={`${id}-providers`}
            >
              <div className="model-menu-heading">
                {pt ? "Provedores" : "Providers"}
              </div>
              {modelProviders.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  id={`${id}-${item.id}`}
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={active === item.id}
                  aria-controls={
                    active === item.id ? `${id}-models` : undefined
                  }
                  className={active === item.id ? "active" : ""}
                  onMouseEnter={() => showProvider(item.id)}
                  onClick={() => showProvider(item.id, true)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      showProvider(item.id, true);
                    }
                  }}
                >
                  <span>{item.name}</span>
                  {selectedProvider?.id === item.id && <Check size={12} />}
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
            {provider && (
              <div
                ref={submenu}
                id={`${id}-models`}
                className="model-submenu"
                role="menu"
                aria-label={`${label} · ${provider.name}`}
              >
                <div className="model-menu-heading">{provider.name}</div>
                {provider.models.map((model) => (
                  <button
                    type="button"
                    key={model.id}
                    role="menuitemradio"
                    aria-checked={value === model.id}
                    onClick={() => {
                      onChange(model.id);
                      close();
                    }}
                  >
                    <span>{model.name}</span>
                    {value === model.id && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
