"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
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
const PAD = { top: 40, right: 34, bottom: 74, left: 62 };
/** Baseline shared by the bottom corner labels and the x-axis title. */
const FOOT_OFFSET = 48;
/** Landmark labels. 4 left 16 anonymous dots and the plot read as noise. */
const LABEL_LIMIT = 9;
/** Dot radius range; area-ish encoding of the composite score. */
const R_MIN = 5;
const R_MAX = 12;
/** Keeps the largest dot clear of the frame. The rank domain clamps at #1, so
    without this the top brands render half-on the top border. */
const INSET = R_MAX + 4;

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

/**
 * P2-4: outward-facing quadrant names, styled off both axes instead of four
 * arbitrary hues. Colour tracks the position axis (amber = high) and fill tracks
 * the frequency axis (solid = high), so Leaders is the only solid amber dot and
 * Laggards the faintest hollow one — using only the palette the page already has.
 */
const QUADRANT_COLOR: Record<QuadrantPoint["quadrant"], string> = {
  high_freq_high_pos: "var(--q-high-pos)",
  high_freq_lower_pos: "var(--q-lower-pos)",
  lower_freq_high_pos: "var(--q-high-pos)",
  lower_freq_lower_pos: "var(--q-lower-pos)",
};

const QUADRANT_SOLID: Record<QuadrantPoint["quadrant"], boolean> = {
  high_freq_high_pos: true,
  high_freq_lower_pos: true,
  lower_freq_high_pos: false,
  lower_freq_lower_pos: false,
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
    })),
    { labelLimit: LABEL_LIMIT }
  );
  // Score isn't part of the quadrant model (it isn't plotted on either axis), so
  // the radius scale reads it straight off the board rows.
  const scoreById = new Map(snapshots.map((s) => [s.brandId, s.score]));
  const scores = snapshots.map((s) => s.score);
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 1;
  function radiusOf(brandId: string): number {
    const score = scoreById.get(brandId);
    if (score === undefined || maxScore === minScore) return (R_MIN + R_MAX) / 2;
    return scaleLinear(score, [minScore, maxScore], [R_MIN, R_MAX]);
  }

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
  const fPad = (maxF - minF) * 0.04 || 0.05;
  const rPad = (maxR - minR) * 0.04 || 0.5;
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

  const xOf = (f: number) => scaleLinear(f, freqDomain, [plotLeft + INSET, plotRight - INSET]);
  // Invert Y: #1 (low avgRank) at top
  const yOf = (r: number) => scaleLinear(r, rankDomain, [plotTop + INSET, plotBottom - INSET]);

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
    <div ref={rootRef} className="surface mt-6 overflow-hidden" aria-labelledby={titleId}>
      <div className="surface-head flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h2
            id={titleId}
            className="panel-title text-sm font-semibold text-[var(--text)]"
          >
            {m.category.quadrantTitle}
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
            {m.category.quadrantLead}
          </p>
        </div>
        {hasMovement && (
          <button
            type="button"
            onClick={() => setShowMovement((v) => !v)}
            aria-pressed={movementOn}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              movementOn
                ? "border-transparent bg-[var(--cta-bg)] text-[var(--cta-text)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text)]"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M1.5 8.5 4.5 5l2 2L10.5 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {m.category.quadrantMovementToggle}
          </button>
        )}
      </div>

      {/* Full card width: capping this at max-w-3xl shrank the plot to a third of
          the panel and made 20 dots look scattered. The legend/metrics line
          share the frame so they stay aligned. */}
      <div className="bg-[var(--card)] px-3 py-4 sm:px-5">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={m.category.quadrantTitle}
        >
          {/* Clips the Leaders wash to the frame's rounded top-right corner. */}
          <defs>
            <clipPath id={`${titleId}-plot`}>
              <rect
                x={plotLeft}
                y={plotTop}
                width={plotRight - plotLeft}
                height={plotBottom - plotTop}
                rx={10}
              />
            </clipPath>
          </defs>

          {/* One faint rule per tick plus a frame: without them the dots float in
              white space and nobody can read a value off the plot. */}
          <g aria-hidden>
            {freqTicks.map((f) => (
              <line
                key={`gx-${f}`}
                x1={xOf(f)}
                y1={plotTop}
                x2={xOf(f)}
                y2={plotBottom}
                stroke="var(--grid)"
                strokeWidth={1}
              />
            ))}
            {rankTicks.map((r) => (
              <line
                key={`gy-${r}`}
                x1={plotLeft}
                y1={yOf(r)}
                x2={plotRight}
                y2={yOf(r)}
                stroke="var(--grid)"
                strokeWidth={1}
              />
            ))}
            <rect
              x={plotLeft}
              y={plotTop}
              width={plotRight - plotLeft}
              height={plotBottom - plotTop}
              rx={10}
              fill="none"
              stroke="var(--border-hover)"
              strokeWidth={1.25}
            />
          </g>

          {/* Leaders is the corner every brand wants; a faint wash makes the
              target legible without tinting all four blocks. */}
          <rect
            x={mx}
            y={plotTop}
            width={Math.max(0, plotRight - mx)}
            height={Math.max(0, my - plotTop)}
            fill="var(--q-high-pos)"
            opacity={0.05}
            clipPath={`url(#${titleId}-plot)`}
          />

          {/* Median crosshairs. No quadrant fills beyond Leaders: 20 dots over
              four tinted blocks turns the card into a colour swatch. */}
          <line
            x1={mx}
            y1={plotTop}
            x2={mx}
            y2={plotBottom}
            stroke="var(--border-hover)"
            strokeWidth={1.5}
            strokeDasharray="5 6"
          />
          <line
            x1={plotLeft}
            y1={my}
            x2={plotRight}
            y2={my}
            stroke="var(--border-hover)"
            strokeWidth={1.5}
            strokeDasharray="5 6"
          />
          {/* Naming the dashed lines is what turns "two random lines" into
              "this is the split". */}
          <text
            x={mx + 5}
            y={plotBottom - 6}
            className="fill-[var(--text-muted)]"
            style={{ fontSize: 10.5, fontStyle: "italic" }}
          >
            {m.category.quadrantMedian}
          </text>
          <text
            x={plotRight - 5}
            y={my - 6}
            textAnchor="end"
            className="fill-[var(--text-muted)]"
            style={{ fontSize: 10.5, fontStyle: "italic" }}
          >
            {m.category.quadrantMedian}
          </text>

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
                  className="fill-[var(--text-muted)]"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    opacity: 0.95,
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
            className="fill-[var(--text-secondary)]"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4 }}
          >
            {m.category.quadrantAxisX}
          </text>
          <text
            x={19}
            y={(plotTop + plotBottom) / 2}
            textAnchor="middle"
            transform={`rotate(-90 19 ${(plotTop + plotBottom) / 2})`}
            className="fill-[var(--text-secondary)]"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4 }}
          >
            {m.category.quadrantAxisY}
          </text>

          {/* Ticks: real ranks (#N) and whole percentages, not padded domain edges. */}
          {rankTicks.map((r) => (
            <text
              key={`ry-${r}`}
              x={plotLeft - 10}
              y={yOf(r) + 4}
              textAnchor="end"
              className="fill-[var(--text-muted)]"
              style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            >
              #{r}
            </text>
          ))}
          {freqTicks.map((f) => (
            <text
              key={`tx-${f}`}
              x={xOf(f)}
              y={plotBottom + 22}
              textAnchor="middle"
              className="fill-[var(--text-muted)]"
              style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            >
              {Math.round(f * 100)}%
            </text>
          ))}

          {/* Movement vs prior published period (P2-5) */}
          {movementOn && (
            <g className="quadrant-layer-in">
              {movements.map(({ point, prev }) => {
                const x1 = xOf(prev.appearanceRate);
                const y1 = yOf(prev.avgRank);
                const x2 = xOf(point.appearanceRate);
                const y2 = yOf(point.avgRank);
                const len = Math.hypot(x2 - x1, y2 - y1);
                // Stop short of the current dot, otherwise it swallows the arrowhead.
                const trim = Math.min(radiusOf(point.brandId) + 4, len / 2);
                const k = len > 0 ? (len - trim) / len : 0;
                const tipX = x1 + (x2 - x1) * k;
                const tipY = y1 + (y2 - y1) * k;
                const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
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
                      <>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={tipX}
                          y2={tipY}
                          stroke="var(--text-muted)"
                          strokeWidth={1.5}
                          opacity={0.55}
                        />
                        {/* Placement lives on the wrapper: a CSS transform in the
                            keyframe overrides a transform attribute on the same
                            element, which would snap the arrowhead to the origin.
                            Inside the rotation, -x is back along the trail. */}
                        <g transform={`translate(${tipX} ${tipY}) rotate(${angle})`}>
                          <path
                            className="quadrant-glide"
                            d="M-4 -3 L2 0 L-4 3 z"
                            fill="var(--text-muted)"
                            opacity={0.7}
                            style={
                              { "--glide": `${-(len - trim)}px` } as CSSProperties
                            }
                          />
                        </g>
                      </>
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
            // Everything but the hovered dot recedes, so a 20-dot cloud reads as
            // one selection instead of twenty competing marks.
            const faded = activeId !== null && !isActive;
            const r = radiusOf(p.brandId);
            const solid = QUADRANT_SOLID[p.quadrant];
            // Flip the label inwards near the right edge so long names
            // ("ChatGPT") don't get clipped by the viewBox.
            const flipLabel = cx > plotRight - 105;
            return (
              <g
                key={p.brandId}
                className="transition-opacity duration-150"
                opacity={faded ? 0.3 : 1}
              >
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
                      r={r + 10}
                      fill={QUADRANT_COLOR[p.quadrant]}
                      opacity={0.18}
                    />
                  )}
                  {/* Card-coloured base so hollow dots still occlude whatever
                      grid line or trail passes behind them. */}
                  {!solid && (
                    <circle cx={cx} cy={cy} r={isActive ? r + 2 : r} fill="var(--card)" />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isActive ? r + 2 : r}
                    fill={solid ? QUADRANT_COLOR[p.quadrant] : "none"}
                    stroke={solid ? "var(--card)" : QUADRANT_COLOR[p.quadrant]}
                    strokeWidth={solid ? 2.5 : 2}
                    opacity={isActive ? 1 : 0.92}
                    className="cursor-pointer transition-[r] duration-150"
                  />
                  {/* Larger invisible hit target for touch */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={Math.max(21, r + 12)}
                    fill="transparent"
                    className="cursor-pointer"
                  />
                </a>
                {showLabel && (
                  <text
                    x={flipLabel ? cx - (r + 6) : cx + r + 6}
                    y={Math.max(plotTop + 6, cy - (r + 6))}
                    textAnchor={flipLabel ? "end" : "start"}
                    className={`pointer-events-none ${
                      isActive ? "fill-[var(--text)]" : "fill-[var(--text-secondary)]"
                    }`}
                    // Stroke-behind-fill halo keeps names legible where they cross
                    // a grid line or another dot.
                    style={{
                      fontSize: 11.5,
                      fontWeight: isActive ? 600 : 500,
                      paintOrder: "stroke",
                      stroke: "var(--card)",
                      strokeWidth: 3.5,
                      strokeLinejoin: "round",
                    }}
                  >
                    {p.brandName}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected point: brand + key metrics. Works on touch (tap) and pointer
            (hover). The empty state states the interaction instead of leaving a
            reserved blank strip. */}
        <div className="mt-2 flex min-h-[2rem] items-center px-2 text-xs">
          {active ? (
            <span
              className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border px-3 py-1.5"
              style={{
                borderColor: QUADRANT_COLOR[active.quadrant],
                background: "var(--bg-elevated)",
              }}
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={
                  QUADRANT_SOLID[active.quadrant]
                    ? { background: QUADRANT_COLOR[active.quadrant] }
                    : {
                        boxShadow: `inset 0 0 0 1.5px ${QUADRANT_COLOR[active.quadrant]}`,
                      }
                }
              />
              <Link
                href={brandHref(active.brandSlug)}
                className="font-semibold text-[var(--text)] underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)]"
              >
                {active.brandName}
              </Link>
              <span className="font-medium text-[var(--text-secondary)]">
                {quadrantName[active.quadrant]}
              </span>
              <span className="num font-mono text-[var(--text-muted)]">
                {m.category.quadrantPointMetrics(
                  `${(active.appearanceRate * 100).toFixed(0)}%`,
                  active.avgRank.toFixed(1)
                )}
              </span>
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">{m.category.quadrantPointHint}</span>
          )}
        </div>

        {movementOn && (
          <p className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
            {m.category.quadrantMovementHint}
          </p>
        )}

        {/* Legend explains what each colour means without reading the axes. */}
        <div className="mt-3 grid gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-[11px] sm:grid-cols-2">
          {(
            [
              "high_freq_high_pos",
              "high_freq_lower_pos",
              "lower_freq_high_pos",
              "lower_freq_lower_pos",
            ] as QuadrantPoint["quadrant"][]
          ).map((qid) => (
            <span key={qid} className="inline-flex items-baseline gap-1.5">
              {/* Swatch mirrors the plot exactly: filled or hollow, amber or ink. */}
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full"
                style={
                  QUADRANT_SOLID[qid]
                    ? { background: QUADRANT_COLOR[qid] }
                    : { boxShadow: `inset 0 0 0 1.5px ${QUADRANT_COLOR[qid]}` }
                }
              />
              <span className="font-semibold text-[var(--text-secondary)]">
                {quadrantName[qid]}
              </span>
              <span className="text-[var(--text-muted)]">{quadrantMeaning[qid]}</span>
            </span>
          ))}
          {/* Radius is a real encoding now, so it needs a key like the colours. */}
          <span className="inline-flex items-center gap-1.5 border-t border-[var(--border)] pt-1.5 text-[var(--text-muted)] sm:col-span-2">
            <svg aria-hidden viewBox="0 0 34 12" className="h-3 w-[34px] shrink-0">
              <circle cx="4" cy="6" r="2.5" fill="var(--text-muted)" opacity={0.6} />
              <circle cx="14" cy="6" r="4" fill="var(--text-muted)" opacity={0.6} />
              <circle cx="27" cy="6" r="5.5" fill="var(--text-muted)" opacity={0.6} />
            </svg>
            {m.category.quadrantSizeLegend}
          </span>
        </div>
      </div>
    </div>
  );
}
