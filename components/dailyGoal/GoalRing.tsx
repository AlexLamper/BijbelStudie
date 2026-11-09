/**
 * Today's goal as a ring: a light track, a teal arc from twelve o'clock, and
 * a check in the middle once the goal is in. The same drawing as the app's
 * DailyGoalRing (lib/features/daily_goal/present/daily_goal_ring.dart).
 */
export default function GoalRing({
  progress,
  size = 56,
  stroke = 6,
  children,
}: {
  /** 0..1 */
  progress: number
  size?: number
  stroke?: number
  children?: React.ReactNode
}) {
  const p = Math.max(0, Math.min(1, progress))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const done = p >= 1
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {p > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={done ? "var(--gold)" : "var(--teal)"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
            style={{ transition: "stroke-dashoffset 600ms ease-out" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
