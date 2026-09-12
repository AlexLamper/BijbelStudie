"use client";

/**
 * Two tab shapes, one component (design_handoff_web/COMPONENTS.md).
 *
 * `underline` - teal label with a 2 px teal rule under it. Used on the reading
 * pane, /notities and /profiel.
 * `segmented` - a teal plate behind the active label, radius 9. Used where the
 * tabs are a control rather than a heading.
 *
 * `tone="dark"` is the same two shapes inside the Levensboom panel, which is
 * `--panel-dark`: white on the active tab, 60 % white on the rest.
 */

export type TabItem = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Rendered after the label - the PRO badge on Grondtekst, for instance. */
  badge?: React.ReactNode;
};

export default function Tabs({
  items,
  value,
  onChange,
  variant = "underline",
  tone = "light",
  className = "",
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: "underline" | "segmented";
  tone?: "light" | "dark";
  className?: string;
}) {
  if (variant === "segmented") {
    return (
      <div className={`inline-flex items-center gap-1 rounded-[12px] border border-line bg-white p-[5px] ${className}`}>
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={[
                "inline-flex h-9 items-center gap-2 rounded-[9px] px-[14px] text-[13px] transition-colors",
                active ? "bg-teal font-semibold text-white" : "font-medium text-ink-body hover:bg-line-soft",
              ].join(" ")}
            >
              {item.icon}
              {item.label}
              {item.badge}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex items-stretch gap-[22px] ${className}`}>
      {items.map((item) => {
        const active = item.value === value;
        const colour = active
          ? tone === "dark"
            ? "text-white font-bold"
            : "text-teal font-semibold"
          : tone === "dark"
            ? "text-white/60 font-medium hover:text-white/85"
            : "text-ink-muted font-medium hover:text-ink-body";
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`relative inline-flex items-center gap-[6px] whitespace-nowrap text-[13px] transition-colors ${colour}`}
          >
            {item.icon}
            {item.label}
            {item.badge}
            {active && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-teal" />}
          </button>
        );
      })}
    </div>
  );
}
