"use client";

import type { BrandHistoryPoint } from "@/lib/brand-history";

function formatShortWeek(weekDate: string): string {
  const date = new Date(`${weekDate}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

type ChartPoint = { label: string; value: number };

function TrendLineChart({
  title,
  points,
  invertY = false,
  formatValue = (value) => String(value),
  yDomain,
}: {
  title: string;
  points: ChartPoint[];
  invertY?: boolean;
  formatValue?: (value: number) => string;
  yDomain?: { min: number; max: number };
}) {
  if (points.length < 2) return null;

  const width = 280;
  const height = 44;
  const padX = 6;
  const padY = 6;

  const values = points.map((p) => p.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const minVal = yDomain?.min ?? dataMin;
  const maxVal = yDomain?.max ?? dataMax;
  // When all values are equal, keep the line centred vertically
  const range = maxVal - minVal || (maxVal * 0.1) || 1;

  const toX = (index: number) =>
    padX + (index / (points.length - 1)) * (width - padX * 2);
  const toY = (value: number) => {
    const clamped = Math.min(maxVal, Math.max(minVal, value));
    const normalized = (clamped - minVal) / range;
    if (invertY) return padY + normalized * (height - padY * 2);
    return padY + (1 - normalized) * (height - padY * 2);
  };

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
    .join(" ");

  const latest = points[points.length - 1];
  const first = points[0].value;
  const last = latest.value;

  const improved = invertY ? last < first : last > first;
  const worsened = invertY ? last > first : last < first;
  const lineColor = improved
    ? "var(--green)"
    : worsened
      ? "var(--red)"
      : "var(--text-secondary)";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-[var(--text-muted)]">{title}</span>
        <span className="font-mono text-[11px] font-medium" style={{ color: lineColor }}>
          {formatValue(latest.value)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ height: 44, width: "100%" }}
        role="img"
        aria-label={`${title} from ${points[0].label} to ${latest.label}`}
      >
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={toX(0).toFixed(1)}
          cy={toY(points[0].value).toFixed(1)}
          r="2.5"
          fill={lineColor}
        />
        <circle
          cx={toX(points.length - 1).toFixed(1)}
          cy={toY(latest.value).toFixed(1)}
          r="2.5"
          fill={lineColor}
        />
      </svg>
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-[var(--text-muted)]">
        <span>{points[0].label}</span>
        <span>{latest.label}</span>
      </div>
    </div>
  );
}

export function BrandTrendCharts({ points }: { points: BrandHistoryPoint[] }) {
  if (points.length < 2) return null;

  const rankPoints = points.map((p) => ({ label: formatShortWeek(p.weekDate), value: p.rank }));
  const scorePoints = points.map((p) => ({ label: formatShortWeek(p.weekDate), value: p.score }));

  return (
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-0 border-t border-[var(--border)] pt-4">
      <TrendLineChart
        title="Rank"
        points={rankPoints}
        invertY
        formatValue={(v) => `#${v}`}
        yDomain={{ min: 1, max: 20 }}
      />
      <TrendLineChart
        title="Score"
        points={scorePoints}
        formatValue={(v) => v.toFixed(1)}
        yDomain={{ min: 0, max: 100 }}
      />
    </div>
  );
}
