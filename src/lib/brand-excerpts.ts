/** P1: select raw AI answer excerpts for Brand Page (no rewrite / no LLM). */

export const EXCERPT_MAX_CHARS = 280;
/** One excerpt per engine is enough for Brand Page evidence. */
export const EXCERPTS_PER_ENGINE = 1;

export type ExcerptCandidate = {
  responseId: string;
  rawText: string;
  /** Mention order in the answer (1 = first recommended). */
  position: number;
};

export function normalizeExcerptText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Longest-first so "GitHub Copilot" beats "GitHub". */
export function rankMatchNames(names: string[]): string[] {
  return [...new Set(names.map((n) => n.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );
}

/**
 * Find first case-insensitive match of any name/alias; return char index + matched length.
 */
export function findNameMatch(
  rawText: string,
  names: string[]
): { index: number; length: number } | null {
  const lower = rawText.toLowerCase();
  let best: { index: number; length: number } | null = null;
  for (const name of rankMatchNames(names)) {
    const needle = name.toLowerCase();
    if (!needle) continue;
    const index = lower.indexOf(needle);
    if (index < 0) continue;
    if (!best || index < best.index || (index === best.index && name.length > best.length)) {
      best = { index, length: name.length };
    }
  }
  return best;
}

/**
 * Cut a ≤maxChars window around the match, preferring nearby sentence boundaries.
 */
export function extractExcerptWindow(
  rawText: string,
  matchIndex: number,
  matchLength: number,
  maxChars = EXCERPT_MAX_CHARS
): string {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;

  let start = Math.max(0, matchIndex - Math.floor((maxChars - matchLength) / 2));
  let end = Math.min(rawText.length, start + maxChars);

  const before = rawText.slice(Math.max(0, start - 80), start);
  const sentenceBreak = Math.max(
    before.lastIndexOf(". "),
    before.lastIndexOf("! "),
    before.lastIndexOf("? "),
    before.lastIndexOf("\n")
  );
  if (sentenceBreak >= 0) {
    start = Math.max(0, start - 80 + sentenceBreak + 2);
    end = Math.min(rawText.length, start + maxChars);
  }

  let snippet = rawText.slice(start, end).replace(/\s+/g, " ").trim();
  if (snippet.length > maxChars) snippet = snippet.slice(0, maxChars).trim();
  if (start > 0 && !snippet.startsWith("…")) snippet = `…${snippet}`;
  if (end < rawText.length && !snippet.endsWith("…")) snippet = `${snippet}…`;
  return snippet.slice(0, maxChars);
}

/**
 * Select up to EXCERPTS_PER_ENGINE excerpts: must contain a name/alias;
 * earlier in answer first; one per response; drop normalized duplicates.
 */
export function selectBrandExcerpts(
  candidates: ExcerptCandidate[],
  names: string[],
  maxCount = EXCERPTS_PER_ENGINE
): string[] {
  const matchNames = rankMatchNames(names);
  if (matchNames.length === 0 || candidates.length === 0) return [];

  type Scored = {
    responseId: string;
    text: string;
    charIndex: number;
    position: number;
  };

  const scored: Scored[] = [];
  for (const candidate of candidates) {
    if (!candidate.rawText?.trim()) continue;
    const match = findNameMatch(candidate.rawText, matchNames);
    if (!match) continue;
    const text = extractExcerptWindow(
      candidate.rawText,
      match.index,
      match.length,
      EXCERPT_MAX_CHARS
    );
    if (!text) continue;
    // Still require a name in the excerpt window after cutting.
    if (!findNameMatch(text, matchNames)) continue;
    scored.push({
      responseId: candidate.responseId,
      text,
      charIndex: match.index,
      position: candidate.position,
    });
  }

  scored.sort((a, b) => {
    if (a.charIndex !== b.charIndex) return a.charIndex - b.charIndex;
    if (a.position !== b.position) return a.position - b.position;
    return a.responseId.localeCompare(b.responseId);
  });

  const usedResponses = new Set<string>();
  const usedNormalized = new Set<string>();
  const selected: string[] = [];

  for (const row of scored) {
    if (usedResponses.has(row.responseId)) continue;
    const key = normalizeExcerptText(row.text);
    if (!key || usedNormalized.has(key)) continue;
    usedResponses.add(row.responseId);
    usedNormalized.add(key);
    selected.push(row.text);
    if (selected.length >= maxCount) break;
  }

  return selected;
}
