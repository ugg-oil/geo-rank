"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  buildCompetitionQuadrant,
  type QuadrantPoint,
} from "@/lib/competition-quadrant";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { LeaderboardRow } from "@/lib/leaderboard-data";

type Props = {
  snapshots: LeaderboardRow[];
  sourcePath: string;
};

const VIEW_W = 640;
const VIEW_H = 420;
const PAD = { top: 36, right: 28, bottom: 48, left: 52 };

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

function quadrantCornerLabel(
  id: QuadrantPoint["quadrant"],
  labels: {
    highFreq: string;
    lowerFreq: string;
    highPos: string;
    lowerPos: string;
  }
): string {
  switch (id) {
    case "high_freq_high_pos":
      return `${labels.highFreq} · ${labels.highPos}`;
    case "high_freq_lower_pos":
      return `${labels.highFreq} · ${labels.lowerPos}`;
    case "lower_freq_high_pos":
      return `${labels.lowerFreq} · ${labels.highPos}`;
    case "lower_freq_lower_pos":
      return `${labels.lowerFreq} · ${labels.lowerPos}`;
  }
}

export function CompetitionQuadrantChart({ snapshots, sourcePath }: Props) {
  const { m } = useI18n();
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
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const clearActive = useCallback(() => setActiveId(null), []);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) clearActive();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [clearActive]);

  if (!model) return null;

  const freqs = model.points.map((p) => p.appearanceRate);
  const ranks = model.points.map((p) => p.avgRank);
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
  const rankDomain: [number, number] = [minR - rPad, maxR + rPad];

  const plotLeft = PAD.left;
  const plotRight = VIEW_W - PAD.right;
  const plotTop = PAD.top;
  const plotBottom = VIEW_H - PAD.bottom;

  const xOf = (f: number) => scaleLinear(f, freqDomain, [plotLeft, plotRight]);
  // Invert Y: #1 (low avgRank) at top
  const yOf = (r: number) => scaleLinear(r, rankDomain, [plotTop, plotBottom]);

  const mx = xOf(model.medianFrequency);
  const my = yOf(model.medianAvgRank);
  const qLabels = {
    highFreq: m.category.quadrantHighFreq,
    lowerFreq: m.category.quadrantLowerFreq,
    highPos: m.category.quadrantHighPos,
    lowerPos: m.category.quadrantLowerPos,
  };

  const active = model.points.find((p) => p.brandId === activeId) ?? null;

  const cornerPositions: Record<
    QuadrantPoint["quadrant"],
    { x: number; y: number; anchor: "start" | "end" }
  > = {
    lower_freq_high_pos: { x: plotLeft + 8, y: plotTop + 14, anchor: "start" },
    high_freq_high_pos: { x: plotRight - 8, y: plotTop + 14, anchor: "end" },
    lower_freq_lower_pos: {
      x: plotLeft + 8,
      y: plotBottom - 10,
      anchor: "start",
    },
    high_freq_lower_pos: {
      x: plotRight - 8,
      y: plotBottom - 10,
      anchor: "end",
    },
  };

  function brandHref(slug: string) {
    return `/brand/${slug}?from=${encodeURIComponent(sourcePath)}`;
  }

  return (
    <div
      ref={rootRef}
      className="mt-8 overflow-hidden rounded-xl border border-[var(--border)]"
      aria-labelledby={titleId}
    >
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
        <h2 id={titleId} className="text-sm font-semibold text-[var(--text)]">
          {m.category.quadrantTitle}
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {m.category.quadrantLead}
        </p>
      </div>

      <div className="bg-[var(--card)] px-2 py-3 sm:px-4">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full"
          role="img"
          aria-label={m.category.quadrantTitle}
        >
          {/* Plot frame */}
          <rect
            x={plotLeft}
            y={plotTop}
            width={plotRight - plotLeft}
            height={plotBottom - plotTop}
            fill="var(--bg-elevated)"
            stroke="var(--border)"
            strokeWidth={1}
          />

          {/* Median crosshairs */}
          <line
            x1={mx}
            y1={plotTop}
            x2={mx}
            y2={plotBottom}
            stroke="var(--border-hover)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <line
            x1={plotLeft}
            y1={my}
            x2={plotRight}
            y2={my}
            stroke="var(--border-hover)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          {/* Quadrant corner hints */}
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
                  style={{ fontSize: 9, opacity: 0.75 }}
                >
                  {quadrantCornerLabel(qid, qLabels)}
                </text>
              );
            }
          )}

          {/* Axes labels */}
          <text
            x={(plotLeft + plotRight) / 2}
            y={VIEW_H - 12}
            textAnchor="middle"
            className="fill-[var(--text-secondary)]"
            style={{ fontSize: 11 }}
          >
            {m.category.quadrantAxisX}
          </text>
          <text
            x={14}
            y={(plotTop + plotBottom) / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${(plotTop + plotBottom) / 2})`}
            className="fill-[var(--text-secondary)]"
            style={{ fontSize: 11 }}
          >
            {m.category.quadrantAxisY}
          </text>

          {/* Tick labels */}
          <text
            x={plotLeft}
            y={plotBottom + 18}
            textAnchor="start"
            className="fill-[var(--text-muted)]"
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          >
            {(freqDomain[0] * 100).toFixed(0)}%
          </text>
          <text
            x={plotRight}
            y={plotBottom + 18}
            textAnchor="end"
            className="fill-[var(--text-muted)]"
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          >
            {(freqDomain[1] * 100).toFixed(0)}%
          </text>
          <text
            x={plotLeft - 8}
            y={plotTop + 4}
            textAnchor="end"
            className="fill-[var(--text-muted)]"
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          >
            {rankDomain[0].toFixed(1)}
          </text>
          <text
            x={plotLeft - 8}
            y={plotBottom}
            textAnchor="end"
            className="fill-[var(--text-muted)]"
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          >
            {rankDomain[1].toFixed(1)}
          </text>

          {/* Points */}
          {model.points.map((p) => {
            const cx = xOf(p.appearanceRate);
            const cy = yOf(p.avgRank);
            const isActive = activeId === p.brandId;
            const showLabel = p.defaultLabel || isActive;
            return (
              <g key={p.brandId}>
                <a
                  href={brandHref(p.brandSlug)}
                  onClick={(e) => {
                    // First tap selects / shows name; second click (when already
                    // active) follows the link. Prevents accidental navigation on mobile.
                    if (activeId !== p.brandId) {
                      e.preventDefault();
                      setActiveId(p.brandId);
                    }
                  }}
                  onMouseEnter={() => setActiveId(p.brandId)}
                  onFocus={() => setActiveId(p.brandId)}
                  className="outline-none"
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isActive ? 7 : 5}
                    fill={isActive ? "var(--text)" : "var(--text-secondary)"}
                    stroke="var(--card)"
                    strokeWidth={1.5}
                    className="cursor-pointer transition-[r] duration-150"
                  />
                  {/* Larger invisible hit target for touch */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={14}
                    fill="transparent"
                    className="cursor-pointer"
                  />
                </a>
                {showLabel && (
                  <text
                    x={cx + 10}
                    y={cy - 10}
                    className="fill-[var(--text)] pointer-events-none"
                    style={{ fontSize: 11, fontWeight: 500 }}
                  >
                    {p.brandName}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {active && (
          <p className="mt-1 px-2 text-center text-xs text-[var(--text-secondary)] sm:hidden">
            <Link
              href={brandHref(active.brandSlug)}
              className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-[3px]"
            >
              {active.brandName}
            </Link>
            <span className="text-[var(--text-muted)]">
              {" · "}
              {(active.appearanceRate * 100).toFixed(0)}%
              {" · #"}
              {active.avgRank.toFixed(1)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
