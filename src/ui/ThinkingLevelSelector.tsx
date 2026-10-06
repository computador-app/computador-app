import type { Locale } from "../i18n";
import type { ThinkingLevel } from "../shared/protocol";

const labels: Record<ThinkingLevel, { "pt-BR": string; en: string }> = {
  off: { "pt-BR": "Desativado", en: "Off" },
  minimal: { "pt-BR": "Mínimo", en: "Minimal" },
  low: { "pt-BR": "Baixo", en: "Low" },
  medium: { "pt-BR": "Médio", en: "Medium" },
  high: { "pt-BR": "Alto", en: "High" },
  xhigh: { "pt-BR": "Muito alto", en: "Extra high" },
  max: { "pt-BR": "Máximo", en: "Maximum" },
};

export function preferredThinkingLevel(
  levels: ThinkingLevel[],
  current?: ThinkingLevel,
) {
  if (current && levels.includes(current)) return current;
  if (levels.includes("medium")) return "medium";
  if (levels.includes("off")) return "off";
  return levels[0] ?? "off";
}

export function ThinkingLevelSelector({
  value,
  levels,
  locale,
  disabled = false,
  label,
  onChange,
}: {
  value: ThinkingLevel;
  levels: ThinkingLevel[];
  locale: Locale;
  disabled?: boolean;
  label: string;
  onChange: (level: ThinkingLevel) => void;
}) {
  const available = levels.length ? levels : (["off"] as ThinkingLevel[]);
  return (
    <select
      className="thinking-level-selector"
      aria-label={label}
      title={label}
      value={preferredThinkingLevel(available, value)}
      disabled={disabled || available.length < 2}
      onChange={(event) => onChange(event.target.value as ThinkingLevel)}
    >
      {available.map((level) => (
        <option key={level} value={level}>
          {labels[level][locale]}
        </option>
      ))}
    </select>
  );
}

export { labels as thinkingLevelLabels };
