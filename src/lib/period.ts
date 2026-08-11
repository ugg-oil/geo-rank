/**
 * Period (= collection cycle) helpers.
 * Storage/blob keys stay `Week of YYYY-MM-DD` for backward compatibility.
 * Display and comparisons use bare `YYYY-MM-DD` (P0: no "Week of" in UI).
 */

const PERIOD_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Epoch Monday for aligning multi-week periods (UTC calendar date). */
const PERIOD_EPOCH = "2024-01-01";

export function normalizePeriodDate(input: string): string {
  const date = input.trim().replace(/^Week of\s+/i, "");
  if (!PERIOD_DATE_RE.test(date)) {
    throw new Error(`Invalid period date: ${input}`);
  }
  return date;
}

/** Blob/DB key used by existing published paths. */
export function toStoragePeriodKey(dateOrWeek: string): string {
  return `Week of ${normalizePeriodDate(dateOrWeek)}`;
}

export function isStoragePeriodKey(value: string): boolean {
  return /^Week of \d{4}-\d{2}-\d{2}$/i.test(value.trim());
}

export function tryNormalizePeriodDate(input: string): string | null {
  try {
    return normalizePeriodDate(input);
  } catch {
    return null;
  }
}

/** UI label: bare period start date only. */
export function formatPeriodDate(dateOrWeek: string): string {
  return normalizePeriodDate(dateOrWeek);
}

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function formatLocalDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function startOfMonday(date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

export function addDays(yyyyMmDd: string, days: number): string {
  const d = parseLocalDate(yyyyMmDd);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/**
 * Period start for `periodDays` (default 7 = Monday week, matching historical data).
 * Longer periods align to Monday buckets from PERIOD_EPOCH.
 */
export function getPeriodStartDate(periodDays = 7, now = new Date()): string {
  const monday = formatLocalDate(startOfMonday(now));
  if (periodDays <= 7) return monday;

  const epoch = PERIOD_EPOCH;
  const mondayTime = parseLocalDate(monday).getTime();
  const epochTime = parseLocalDate(epoch).getTime();
  const dayOffset = Math.floor((mondayTime - epochTime) / 86_400_000);
  const bucket = Math.floor(dayOffset / periodDays) * periodDays;
  return addDays(epoch, bucket);
}

/** @deprecated Prefer getCurrentPeriodKey — kept name for call-site compatibility. */
export function getCurrentWeek(): string {
  return toStoragePeriodKey(getPeriodStartDate(7));
}

export function getCurrentPeriodKey(periodDays = 7, now = new Date()): string {
  return toStoragePeriodKey(getPeriodStartDate(periodDays, now));
}

/**
 * Calendar previous period (for scheduling / backfill windows).
 * Rank Δ should use published sequence, not this, when available.
 */
export function getPreviousWeek(week: string, periodDays = 7): string {
  const start = normalizePeriodDate(week);
  return toStoragePeriodKey(addDays(start, -periodDays));
}

export function getPreviousPeriodKey(week: string, periodDays = 7): string {
  return getPreviousWeek(week, periodDays);
}

/** True when this run's period start is a valid collection boundary for the category cadence. */
export function shouldCollectCategoryInPeriod(
  categoryPeriodDays: number,
  runPeriodKey: string
): boolean {
  const runDate = normalizePeriodDate(runPeriodKey);
  const expected = getPeriodStartDate(categoryPeriodDays, parseLocalDate(runDate));
  return runDate === expected;
}

/** Prompt suffix for historical backfill (P5): ` as of YYYY-MM-DD`. */
export function backfillPromptSuffix(periodKeyOrDate: string): string {
  return ` as of ${normalizePeriodDate(periodKeyOrDate)}`;
}
