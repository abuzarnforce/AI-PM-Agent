"use client";

/** The Intelligence Layer: product signals flowing into PM Agent and coming out
 * as insight → decision → action. Sources that aren't connected are drawn
 * dimmed and static, so the picture never claims an integration that isn't live. */

const SOURCES = ["Jira", "GitHub", "QA", "Feedback", "Analytics"] as const;
const OUTPUTS = ["Insight", "Decision", "Action"] as const;
export type SourceName = (typeof SOURCES)[number];

export default function IntelligenceLayer({
  live = { Jira: true, GitHub: true, QA: true, Feedback: true, Analytics: false },
  className = "",
}: {
  live?: Partial<Record<SourceName, boolean>>;
  className?: string;
}) {
  const W = 640;
  const cx = 320;
  const cy = 110;
  const srcY = (i: number) => 22 + i * 44;
  const outY = (i: number) => 66 + i * 44;

  return (
    <svg
      viewBox={`0 0 ${W} 220`}
      className={`w-full ${className}`}
      role="img"
      aria-label="Jira, GitHub, QA and feedback flow into PM Agent and become insight, decisions and actions"
    >
      {SOURCES.map((s, i) => {
        const y = srcY(i);
        const on = !!live[s];
        return (
          <g key={s}>
            <path
              d={`M 118 ${y} C 210 ${y}, 220 ${cy}, ${cx - 58} ${cy}`}
              fill="none"
              stroke="rgb(var(--color-accent))"
              strokeOpacity={on ? 0.55 : 0.12}
              strokeWidth={1.25}
              className={on ? "flow-line" : undefined}
              style={on ? { animationDelay: `${i * -0.3}s` } : { strokeDasharray: "2 6" }}
            />
            <rect x={20} y={y - 13} width={98} height={26} rx={6} fill="rgb(var(--color-panel))" stroke="rgb(var(--color-border))" />
            <circle cx={34} cy={y} r={3} fill={on ? "rgb(var(--tone-green))" : "rgb(var(--color-subtle))"} />
            <text x={44} y={y + 4} fontSize={12} fill="rgb(var(--color-fg))" fillOpacity={on ? 0.9 : 0.4}>
              {s}
            </text>
          </g>
        );
      })}

      {OUTPUTS.map((o, i) => {
        const y = outY(i);
        return (
          <g key={o}>
            <path
              d={`M ${cx + 58} ${cy} C 420 ${cy}, 430 ${y}, 522 ${y}`}
              fill="none"
              stroke="rgb(var(--color-fg))"
              strokeOpacity={0.35}
              strokeWidth={1.25}
              className="flow-line"
              style={{ animationDelay: `${i * -0.4}s` }}
            />
            <rect x={522} y={y - 13} width={98} height={26} rx={6} fill="rgb(var(--color-panel))" stroke="rgb(var(--color-border))" />
            <text x={571} y={y + 4} fontSize={12} textAnchor="middle" fill="rgb(var(--color-fg))" fillOpacity={0.9}>
              {o}
            </text>
          </g>
        );
      })}

      <rect x={cx - 58} y={cy - 24} width={116} height={48} rx={10} fill="rgb(var(--color-fg))" />
      <text x={cx} y={cy + 5} fontSize={14} fontWeight={600} textAnchor="middle" fill="rgb(var(--color-bg))">
        PM Agent
      </text>
    </svg>
  );
}

/** The mark: three signal lines converging on a point. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md bg-fg text-bg"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 16 16" fill="none">
        <path d="M2 3.5 C7 3.5 8 8 12 8 M2 8 H12 M2 12.5 C7 12.5 8 8 12 8" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        <circle cx={13} cy={8} r={1.8} fill="currentColor" />
      </svg>
    </div>
  );
}
