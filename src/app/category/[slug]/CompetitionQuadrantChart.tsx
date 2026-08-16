"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  buildCompetitionQuadrant,
  selectQuadrantMovements,
  type QuadrantPoint,
} from "@/lib/competition-quadrant";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { LeaderboardRow } from "@/lib/leaderboard-data";

type Props = {
  snapshots: LeaderboardRow[];
  sourcePath: string;
  /** P2-5: prior published period metrics (Overall). Omit to hide the movement overlay. */
  prevMetrics?: Record<string, { appearanceRate: number; avgRank: number }>;
};

// The viewBox is sized close to the rendered width on desktop so SVG font sizes
// stay honest: a smaller viewBox scales text up and it ends up larger than the
// surrounding UI copy.
const VIEW_W = 960;
const VIEW_H = 480;
const PAD = { top: 44, right: 50, bottom: 80, left: 80 };
/** Baseline shared by the bottom corner labels and the x-axis title. */
const FOOT_OFFSET = 50;

function scaleLinear(
  value: number,
  domain: [number, number],
  range: [number, number]
): number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return (r0 + r1) / 2;
  return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

/** P2-4: outward-facing quadrant names + one colour per quadrant. */
const QUADRANT_COLOR: Record<QuadrantPoint["quadrant"], string> = {
  high_freq_high_pos: "var(--q-leaders)",
  high_freq_lower_pos: "var(--q-challengers)",
  lower_freq_high_pos: "var(--q-niche)",
  lower_freq_lower_pos: "var(--q-laggards)",
};

/**
 * Evenly spaced ticks inside a domain. Steps come from a fixed set so the gaps
 * stay regular whatever the domain is — a trailing odd tick reads as a bug.
 */
function ticksFor(
  min: number,
  max: number,
  steps: number[],
  maxTicks: number,
  /** Ranks start counting at the domain edge (#1), percentages at a round step. */
  anchorAtMin = false
): number[] {
  const step = steps.find((s) => (max - min) / s <= maxTicks - 1) ?? steps.at(-1)!;
  const ticks: number[] = [];
  const start = anchorAtMin ? Math.ceil(min) : Math.ceil(min / step) * step;
  for (let v = start; v <= max + 1e-9; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks.length > 0 ? ticks : [Math.round(min)];
}

export function CompetitionQuadrantChart({
  snapshots,
  sourcePath,
  prevMetrics,
}: Props) {
  const { m } = useI18n();
  const [showMovement, setShowMovement] = useState(false);
  const model = buildCompetitionQuadrant(
    snapshots.map((s) => ({
      brandId: s.brandId,
      brandName: s.brandName,
      brandSlug: s.brandSlug,
      appearanceRate: s.appearanceRate,
      avgRank: s.avgRank,
    }))
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  // Which point the last touch tap landed on. Touch synthesises hover events, so
  // activeId alone can't tell "first tap" from "tap again to open".
  const lastTapRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const clearActive = useCallback(() => {
    setActiveId(null);
    lastTapRef.current = null;
  }, []);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) clearActive();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [clearActive]);

  if (!model) return null;

  const movements = selectQuadrantMovements(model.points, prevMetrics);
  const hasMovement = movements.length > 0;
  const movementOn = showMovement && hasMovement;

  // Scale over the union of both periods so prior-period dots stay inside the frame.
  const freqs = [
    ...model.points.map((p) => p.appearanceRate),
    ...(movementOn ? movements.map((row) => row.prev.appearanceRate) : []),
  ];
  const ranks = [
    ...model.points.map((p) => p.avgRank),
    ...(movementOn ? movements.map((row) => row.prev.avgRank) : []),
  ];
  const minF = Math.min(...freqs);
  const maxF = Math.max(...freqs);
  const minR = Math.min(...ranks);
  const maxR = Math.max(...ranks);
  // Pad domain slightly so points aren't on the frame edge.
  const fPad = (maxF - minF) * 0.08 || 0.05;
  const rPad = (maxR - minR) * 0.08 || 0.5;
  const freqDomain: [number, number] = [
    Math.max(0, minF - fPad),
    Math.min(1, maxF + fPad),
  ];
  // Clamp at 1: an average rank below #1 is not a real value to show on an axis.
  const rankDomain: [number, number] = [Math.max(1, minR - rPad), maxR + rPad];

  const plotLeft = PAD.left;
  const plotRight = VIEW_W - PAD.right;
  const plotTop = PAD.top;
  const plotBottom = VIEW_H - PAD.bottom;

  const xOf = (f: number) => scaleLinear(f, freqDomain, [plotLeft, plotRight]);
  // Invert Y: #1 (low avgRank) at top
  const yOf = (r: number) => scaleLinear(r, rankDomain, [plotTop, plotBottom]);

  const mx = xOf(model.medianFrequency);
  const my = yOf(model.medianAvgRank);

  const quadrantName: Record<QuadrantPoint["quadrant"], string> = {
    high_freq_high_pos: m.category.quadrantLeaders,
    high_freq_lower_pos: m.category.quadrantChallengers,
    lower_freq_high_pos: m.category.quadrantNiche,
    lower_freq_lower_pos: m.category.quadrantLaggards,
  };
  const quadrantMeaning: Record<QuadrantPoint["quadrant"], string> = {
    high_freq_high_pos: `${m.category.quadrantHighFreq} · ${m.category.quadrantHighPos}`,
    high_freq_lower_pos: `${m.category.quadrantHighFreq} · ${m.category.quadrantLowerPos}`,
    lower_freq_high_pos: `${m.category.quadrantLowerFreq} · ${m.category.quadrantHighPos}`,
    lower_freq_lower_pos: `${m.category.quadrantLowerFreq} · ${m.category.quadrantLowerPos}`,
  };

  const active = model.points.find((p) => p.brandId === activeId) ?? null;

  // Corner labels sit just outside the plot so they never collide with dots.
  const cornerPositions: Record<
    QuadrantPoint["quadrant"],
    { x: number; y: number; anchor: "start" | "end" }
  > = {
    lower_freq_high_pos: { x: plotLeft, y: plotTop - 18, anchor: "start" },
    high_freq_high_pos: { x: plotRight, y: plotTop - 18, anchor: "end" },
    lower_freq_lower_pos: {
      x: plotLeft,
      y: plotBottom + FOOT_OFFSET,
      anchor: "start",
    },
    high_freq_lower_pos: {
      x: plotRight,
      y: plotBottom + FOOT_OFFSET,
      anchor: "end",
    },
  };

  const rankTicks = ticksFor(rankDomain[0], rankDomain[1], [1, 2, 5, 10], 4, true);
  const freqTicks = ticksFor(
    freqDomain[0],
    freqDomain[1],
    [0.05, 0.1, 0.2, 0.25, 0.5],
    6
  );

  function brandHref(slug: string) {
    return `/brand/${slug}?from=${encodeURIComponent(sourcePath)}`;
  }

  return (
    <div
      ref={rootRef}
      className="mt-8 overflow-hidden rounded-xl border border-[var(--border)]"
      aria-labelledby={titleId}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-semibold text-[var(--text)]">
            {m.category.quadrantTitle}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {m.category.quadrantLead}
          </p>
        </div>
        {hasMovement && (
          <button
            type="button"
            onClick={() => setShowMovement((v) => !v)}
            aria-pressed={movementOn}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              movementOn
                ? "border-transparent bg-[var(--text)] text-[var(--bg)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text)]"
            }`}
          >
            {m.category.quadrantMovementToggle}
          </button>
        )}
      </div>

      {/* Cap the width so a wide card doesn't scale the whole plot (and its
          fonts) up — full-bleed 16:9 was taller than the fold on desktop. The
          legend/metrics line share the frame so they stay aligned. */}
      <div className="mx-auto max-w-3xl bg-[var(--card)] px-2 py-3 sm:px-4">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={m.category.quadrantTitle}
        >
          {/* Median crosshairs. No quadrant fills: 20 dots over four tinted
              blocks turns the card into a colour swatch. */}
          <line
            x1={mx}
            y1={plotTop}
            x2={mx}
            y2={plotBottom}
            stroke="var(--border)"
            strokeWidth={1.5}
            strokeDasharray="4 7"
          />
          <line
            x1={plotLeft}
            y1={my}
            x2={plotRight}
            y2={my}
            stroke="var(--border)"
            strokeWidth={1.5}
            strokeDasharray="4 7"
          />

          {/* Quadrant corner names */}
          {(Object.keys(cornerPositions) as QuadrantPoint["quadrant"][]).map(
            (qid) => {
              const pos = cornerPositions[qid];
              return (
                <text
                  key={qid}
                  x={pos.x}
                  y={pos.y}
                  textAnchor={pos.anchor}
                  fill={QUADRANT_COLOR[qid]}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    opacity: 0.9,
                  }}
                >
                  {quadrantName[qid]}
                </text>
              );
            }
          )}

          {/* Axis titles */}
          <text
            x={(plotLeft + plotRight) / 2}
            y={plotBottom + FOOT_OFFSET}
            textAnchor="middle"
            className="fill-[var(--text-muted)]"
            style={{ fontSize: 11 }}
          >
            {m.category.quadrantAxisX}
          </text>
          <text
            x={19}
            y={(plotTop + plotBottom) / 2}
            textAnchor="middle"
            transform={`rotate(-90 19 ${(plotTop + plotBottom) / 2})`}
            className="fill-[var(--text-muted)]"
            style={{ fontSize: 11 }}
          >
            {m.category.quadrantAxisY}
          </text>

          {/* Ticks: real ranks (#N) and whole percentages, not padded domain edges. */}
          {rankTicks.map((r) => (
            <text
              key={`ry-${r}`}
              x={plotLeft - 14}
              y={yOf(r) + 4}
              textAnchor="end"
              className="fill-[var(--text-muted)]"
              style={{ fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            >
              #{r}
            </text>
          ))}
          {freqTicks.map((f) => (
            <text
              key={`tx-${f}`}
              x={xOf(f)}
              y={plotBottom + 24}
              textAnchor="middle"
              className="fill-[var(--text-muted)]"
              style={{ fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            >
              {Math.round(f * 100)}%
            </text>
          ))}

          {/* Movement vs prior published period (P2-5) */}
          {movementOn && (
            <g>
              <defs>
                <marker
                  id={`${titleId}-arrow`}
                  viewBox="0 0 8 8"
                  refX={6}
                  refY={4}
                  markerWidth={5}
                  markerHeight={5}
                  orient="auto-start-reverse"
                >
                  <path d="M0 1 L6 4 L0 7 z" fill="var(--text-muted)" />
                </marker>
              </defs>
              {movements.map(({ point, prev }) => {
                const x1 = xOf(prev.appearanceRate);
                const y1 = yOf(prev.avgRank);
                const x2 = xOf(point.appearanceRate);
                const y2 = yOf(point.avgRank);
                const len = Math.hypot(x2 - x1, y2 - y1);
                // Stop short of the current dot, otherwise it swallows the arrowhead.
                const trim = Math.min(11, len / 2);
                const k = len > 0 ? (len - trim) / len : 0;
                return (
                  <g key={`move-${point.brandId}`}>
                    <circle
                      cx={x1}
                      cy={y1}
                      r={5}
                      fill={QUADRANT_COLOR[point.quadrant]}
                      opacity={0.28}
                    />
                    {len > 6 && (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x1 + (x2 - x1) * k}
                        y2={y1 + (y2 - y1) * k}
                        stroke="var(--text-muted)"
                        strokeWidth={1.5}
                        opacity={0.55}
                        markerEnd={`url(#${titleId}-arrow)`}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Points */}
          {model.points.map((p) => {
            const cx = xOf(p.appearanceRate);
            const cy = yOf(p.avgRank);
            const isActive = activeId === p.brandId;
            const showLabel = p.defaultLabel || isActive;
            // Flip the label inwards near the right edge so long names
            // ("ChatGPT") don't get clipped by the viewBox.
            const flipLabel = cx > plotRight - 105;
            return (
              <g key={p.brandId}>
                <a
                  href={brandHref(p.brandSlug)}
                  onClick={(e) => {
                    // Mouse / keyboard navigate immediately — hover or focus has
                    // already revealed the metrics. Touch needs one tap to reveal
                    // them and a second to open the brand page.
                    const pointerType = (e.nativeEvent as PointerEvent).pointerType;
                    if (pointerType !== "touch" && pointerType !== "pen") return;
                    if (lastTapRef.current !== p.brandId) {
                      e.preventDefault();
                      lastTapRef.current = p.brandId;
                      setActiveId(p.brandId);
                    }
                  }}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setActiveId(p.brandId);
                  }}
                  onFocus={() => setActiveId(p.brandId)}
                  className="outline-none"
                >
                  {isActive && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={16}
                      fill={QUADRANT_COLOR[p.quadrant]}
                      opacity={0.16}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isActive ? 8 : 6}
                    fill={QUADRANT_COLOR[p.quadrant]}
                    stroke="var(--card)"
                    strokeWidth={2}
                    opacity={isActive ? 1 : 0.9}
                    className="cursor-pointer transition-[r] duration-150"
                  />
                  {/* Larger invisible hit target for touch */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={21}
                    fill="transparent"
                    className="cursor-pointer"
                  />
                </a>
                {showLabel && (
                  <text
                    x={flipLabel ? cx - 13 : cx + 13}
                    y={Math.max(plotTop + 6, cy - 12)}
                    textAnchor={flipLabel ? "end" : "start"}
                    className={`pointer-events-none ${
                      isActive ? "fill-[var(--text)]" : "fill-[var(--text-secondary)]"
                    }`}
                    style={{ fontSize: 11, fontWeight: 500 }}
                  >
                    {p.brandName}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected point: brand + key metrics. Works on touch (tap) and pointer (hover). */}
        <div className="mt-2 flex min-h-[1.5rem] flex-wrap items-center gap-x-2 gap-y-1 px-2 text-xs">
          {active ? (
            <>
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: QUADRANT_COLOR[active.quadrant] }}
              />
              <Link
                href={brandHref(active.brandSlug)}
                className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)]"
              >
                {active.brandName}
              </Link>
              <span className="font-medium" style={{ color: QUADRANT_COLOR[active.quadrant] }}>
                {quadrantName[active.quadrant]}
              </span>
              <span className="font-mono text-[var(--text-muted)]">
                {m.category.quadrantPointMetrics(
                  `${(active.appearanceRate * 100).toFixed(0)}%`,
                  active.avgRank.toFixed(1)
                )}
              </span>
            </>
          ) : null}
        </div>

        {movementOn && (
          <p className="mt-1 px-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
            {m.category.quadrantMovementHint}
          </p>
        )}

        {/* Legend explains what each colour means without reading the axes. */}
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-[var(--border)] px-2 pt-3 text-[11px]">
          {(
            [
              "high_freq_high_pos",
              "high_freq_lower_pos",
              "lower_freq_high_pos",
              "lower_freq_lower_pos",
            ] as QuadrantPoint["quadrant"][]
          ).map((qid) => (
            <span key={qid} className="inline-flex items-baseline gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full"
                style={{ background: QUADRANT_COLOR[qid] }}
              />
              <span className="font-medium text-[var(--text-secondary)]">
                {quadrantName[qid]}
              </span>
              <span className="text-[var(--text-muted)]">{quadrantMeaning[qid]}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
