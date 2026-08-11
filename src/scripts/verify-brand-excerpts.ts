import assert from "node:assert/strict";
import {
  EXCERPT_MAX_CHARS,
  EXCERPTS_PER_ENGINE,
  extractExcerptWindow,
  findNameMatch,
  normalizeExcerptText,
  selectBrandExcerpts,
} from "@/lib/brand-excerpts";

assert.equal(EXCERPTS_PER_ENGINE, 1);

assert.equal(normalizeExcerptText("  Foo   BAR "), "foo bar");

const sample =
  "For productivity, many teams start with Notion. Others prefer ChatGPT for drafting. ChatGPT is also strong for research.";
const match = findNameMatch(sample, ["ChatGPT", "GPT"]);
assert.ok(match);
assert.equal(sample.slice(match!.index, match!.index + match!.length), "ChatGPT");

const window = extractExcerptWindow(sample, match!.index, match!.length, 80);
assert.ok(window.toLowerCase().includes("chatgpt"));
assert.ok(window.length <= 80);

const selected = selectBrandExcerpts(
  [
    {
      responseId: "r1",
      position: 2,
      rawText:
        "Top picks include Slack for chat. ChatGPT is useful for writing and summarizing long documents across the workday.",
    },
    {
      responseId: "r2",
      position: 1,
      rawText: "ChatGPT leads for general assistants. Claude is close behind for coding help.",
    },
    {
      responseId: "r1",
      position: 1,
      rawText:
        "Top picks include Slack for chat. ChatGPT is useful for writing and summarizing long documents across the workday.",
    },
    {
      responseId: "r3",
      position: 1,
      rawText: "No relevant brands here for this test case about spreadsheets.",
    },
  ],
  ["ChatGPT"]
);

assert.equal(selected.length, 1);
assert.ok(selected[0]!.toLowerCase().includes("chatgpt"));
assert.ok(selected[0]!.length <= EXCERPT_MAX_CHARS);
// Earlier char index wins (r2 mention is nearer the start)
assert.ok(selected[0]!.toLowerCase().includes("leads for general"));

const many = selectBrandExcerpts(
  [
    {
      responseId: "r1",
      position: 2,
      rawText: "Teams use Slack. ChatGPT helps with drafting emails every morning.",
    },
    {
      responseId: "r2",
      position: 1,
      rawText: "ChatGPT leads for general assistants. Claude is close behind.",
    },
    {
      responseId: "r3",
      position: 1,
      rawText: "Another take: ChatGPT remains useful for research summaries.",
    },
  ],
  ["ChatGPT"],
  3
);
assert.equal(many.length, 3);

const dups = selectBrandExcerpts(
  [
    {
      responseId: "a",
      position: 1,
      rawText: "ChatGPT is great for brainstorming ideas quickly.",
    },
    {
      responseId: "b",
      position: 1,
      rawText: "ChatGPT is great for brainstorming ideas quickly.",
    },
  ],
  ["ChatGPT"]
);
assert.equal(dups.length, 1);

console.log("brand excerpt fixtures ok");
