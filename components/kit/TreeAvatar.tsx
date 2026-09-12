import NavTreeAvatar from "../levensboom/NavTreeAvatar";

/**
 * The reader's tree cropped to a disc, at whatever size the page asks for.
 *
 * The picture itself is ALWAYS the existing renderer (components/levensboom/
 * TreeCanvas via NavTreeAvatar) - design_handoff_web/RULES.md §4 is explicit
 * that the prototype's gradient trees are placeholders and the real tree is
 * never rebuilt from them. What this component owns is the frame around it: the
 * sky ground it falls back to, the optional gold level ring, and the level
 * marker in the corner.
 *
 * Not the same thing as components/levensboom/TreeAvatar.tsx, which is the old
 * immersive-scene avatar - that one bends the XP bar into a ring, writes its
 * own white caption underneath and links to the studio. Here the caption and
 * the link belong to the card the disc sits in.
 */
export default function TreeAvatar({
  size,
  ring = 0,
  level,
  levelStyle = "pill",
  className = "",
}: {
  size: number;
  /** Gold ring width in px; 0 draws none. */
  ring?: number;
  level?: number | null;
  /**
   * `pill` - white pill, number in gold-badge (sidebar foot).
   * `gold` - gold pill with a white rim (dashboard rail).
   * `dot`  - filled gold disc, 31 % of the avatar (profile header and rail).
   */
  levelStyle?: "pill" | "gold" | "dot";
  className?: string;
}) {
  const inner = size - ring * 2;
  const dot = Math.round(size * 0.31);

  return (
    <div className={`relative flex-none ${className}`} style={{ width: size, height: size }}>
      <div
        className="h-full w-full rounded-full"
        style={ring ? { padding: ring, backgroundColor: "var(--gold)" } : undefined}
      >
        <div className="h-full w-full overflow-hidden rounded-full bg-sky" style={{ width: inner, height: inner }}>
          <NavTreeAvatar size={inner} showLevel={false} fallback={null} />
        </div>
      </div>

      {level != null && levelStyle === "gold" && (
        <span
          className="absolute -right-[3px] bottom-0 rounded-full bg-gold px-[7px] py-[2px] text-[11px] font-bold leading-none text-gold-ink tabular-nums"
          style={{ border: "1.5px solid var(--surface)" }}
        >
          {level}
        </span>
      )}

      {level != null &&
        levelStyle !== "gold" &&
        (levelStyle === "dot" ? (
          <span
            className="absolute bottom-0 right-0 inline-flex items-center justify-center rounded-full bg-gold font-bold text-gold-ink tabular-nums"
            style={{
              width: dot,
              height: dot,
              fontSize: Math.max(10, Math.round(dot * 0.45)),
              border: "2.5px solid var(--surface)",
            }}
          >
            {level}
          </span>
        ) : (
          <span className="absolute -bottom-[3px] -right-[3px] rounded-full border border-line bg-white px-[5px] py-px text-[10px] font-bold leading-none text-gold-badge tabular-nums">
            {level}
          </span>
        ))}
    </div>
  );
}
