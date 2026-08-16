"use client";

import { useMemo, useState } from "react";
import type { BrandHistoryPoint } from "@/lib/brand-history-data";
import { filterHistoryByRange } from "@/lib/brand-why";
import { formatShortUtcDate, formatWeekLabel } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";

type ChartPoint = { label: string; value: number };

function paddedDomain(values: number[], invertY: boolean, floor?: number, ceil?: number) {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  if (dataMin === dataMax) {
    if (invertY) {
      const center = dataMin;
      return {
        min: Math.max(floor ?? 1, center - 2),
        max: Math.min(ceil ?? 20, center + 2),
      };
    }
    const pad = Math.max(Math.abs(dataMin) * 0.05, 2);
    return {
      min: Math.max(floor ?? 0, dataMin - pad),
      max: Math.min(ceil ?? Number.POSITIVE_INFINITY, dataMax + pad),
    };
  }
  const span = dataMax - dataMin;
  const pad = Math.max(span * 0.2, invertY ? 1 : 2);
  return {
    min: Math.max(floor ?? Number.NEGATIVE_INFINITY, dataMin - pad),
    max: Math.min(ceil ?? Number.POSITIVE_INFINITY, dataMax + pad),
  };
}

function TrendLineChart({
  title,
  points,
  weekCountLabel,
  invertY = false,
  formatValue = (value) => String(value),
  domainFloor,
  domainCeil,
}: {
  title: string;
  points: ChartPoint[];
  weekCountLabel: string;
  invertY?: boolean;
  formatValue?: (value: number) => string;
  domainFloor?: number;
  domainCeil?: number;
}) {
  if (points.length < 2) return null;

  const width = 320;
  const height = 96;
  const padX = 16;
  const padTop = 18;
  const padBottom = 8;

  const values = points.map((p) => p.value);
  const { min: minVal, max: maxVal } = paddedDomain(values, invertY, domainFloor, domainCeil);
  const range = maxVal - minVal || 1;

  const toX = (index: number) =>
    padX + (index / (points.length - 1)) * (width - padX * 2);
  const toY = (value: number) => {
    const clamped = Math.min(maxVal, Math.max(minVal, value));
    const normalized = (clamped - minVal) / range;
    if (invertY) return padTop + normalized * (height - padTop - padBottom);
    return padTop + (1 - normalized) * (height - padTop - padBottom);
  };

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
    .join(" ");

  const latest = points[points.length - 1]!;
  const first = points[0]!.value;
  const last = latest.value;

  const improved = invertY ? last < first : last > first;
  const worsened = invertY ? last > first : last < first;
  const lineColor = improved
    ? "var(--green)"
    : worsened
      ? "var(--red)"
      : "var(--text-secondary)";

  const showAllLabels = points.length <= 6;
  const showPointValues = points.length <= 8;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-[var(--text-muted)]">
          {title}
          <span className="ml-1.5 font-mono text-[10px] tabular-nums text-[var(--text-secondary)]">
            {weekCountLabel}
          </span>
        </span>
        <span className="font-mono text-[11px] font-medium" style={{ color: lineColor }}>
          {formatValue(latest.value)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: 96 }}
        role="img"
        aria-label={`${title}: ${weekCountLabel}, ${points[0]!.label} to ${latest.label}`}
      >
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => {
          const x = toX(i);
          const y = toY(p.value);
          const labelAbove = y > padTop + 14;
          const valueText = formatValue(p.value);
          return (
            <g key={`${p.label}-${i}`}>
              <circle
                cx={x.toFixed(1)}
                cy={y.toFixed(1)}
                r={i === points.length - 1 ? 4 : 3.25}
                fill="var(--card)"
                stroke={lineColor}
                strokeWidth="1.75"
              >
                <title>{`${p.label}: ${valueText}`}</title>
              </circle>
              {showPointValues && (
                <text
                  x={x.toFixed(1)}
                  y={(labelAbove ? y - 8 : y + 14).toFixed(1)}
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontSize="9"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {valueText}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div
        className={`mt-1 grid font-mono text-[10px] text-[var(--text-muted)] ${
          showAllLabels ? "" : "flex justify-between"
        }`}
        style={
          showAllLabels
            ? { gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {showAllLabels ? (
          points.map((p, i) => (
            <span
              key={`${p.label}-label-${i}`}
              className={
                i === 0
                  ? "text-left"
                  : i === points.length - 1
                    ? "text-right"
                    : "text-center"
              }
            >
              {p.label}
            </span>
          ))
        ) : (
          <>
            <span>{points[0]!.label}</span>
            <span>{latest.label}</span>
          </>
        )}
      </div>
    </div>
  );
}

function periodDate(point: BrandHistoryPoint): string {
  return point.weekDate.replace(/^Week of\s+/i, "");
}

export function BrandTrendCharts({ points }: { points: BrandHistoryPoint[] }) {
  const { locale, m } = useI18n();
  const dates = useMemo(
    () => points.map(periodDate),
    [points]
  );

  const defaultStart = dates[0] ?? "";
  const defaultEnd = dates[dates.length - 1] ?? "";
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);

  if (points.length < 2) return null;

  const clampedStart = start <= end ? start : end;
  const clampedEnd = start <= end ? end : start;

  const filtered = filterHistoryByRange(points, clampedStart, clampedEnd);
  const weekCountLabel = m.brand.historyWeeks(filtered.length);
  const rankPoints = filtered.map((p) => ({
    label: formatShortUtcDate(locale, p.weekDate),
    value: p.rank,
  }));
  const scorePoints = filtered.map((p) => ({
    label: formatShortUtcDate(locale, p.weekDate),
    value: p.score,
  }));

  function onStartChange(value: string) {
    setStart(value);
    if (value > end) setEnd(value);
  }

  function onEndChange(value: string) {
    setEnd(value);
    if (value < start) setStart(value);
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
        <label className="flex items-center gap-1.5">
          <span>{m.brand.historyRangeFrom}</span>
          <select
            value={clampedStart}
            onChange={(e) => onStartChange(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
          >
            {dates.map((d) => (
              <option key={`from-${d}`} value={d}>
                {formatWeekLabel(m, d)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span>{m.brand.historyRangeTo}</span>
          <select
            value={clampedEnd}
            onChange={(e) => onEndChange(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
          >
            {dates.map((d) => (
              <option key={`to-${d}`} value={d}>
                {formatWeekLabel(m, d)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">{m.brand.historyRangeEmpty}</p>
      ) : filtered.length < 2 ? (
        <p className="text-xs text-[var(--text-muted)]">{m.brand.historyRangeEmpty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4">
          <TrendLineChart
            title={m.brand.rankHistory}
            points={rankPoints}
            weekCountLabel={weekCountLabel}
            invertY
            formatValue={(v) => `#${v}`}
            domainFloor={1}
            domainCeil={20}
          />
          <TrendLineChart
            title={m.brand.scoreHistory}
            points={scorePoints}
            weekCountLabel={weekCountLabel}
            formatValue={(v) => v.toFixed(1)}
            domainFloor={0}
            domainCeil={100}
          />
        </div>
      )}
    </div>
  );
}
