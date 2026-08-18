import assert from "node:assert/strict";
import { meetsOverallBoardGate } from "@/lib/engine-scoring";
import {
  OVERALL_MIN_APPEARANCE_RATE,
  OVERALL_MIN_SCORING_ENGINES,
} from "@/lib/constants";

assert.equal(OVERALL_MIN_APPEARANCE_RATE, 0.1);
assert.equal(OVERALL_MIN_SCORING_ENGINES, 2);

assert.equal(
  meetsOverallBoardGate({ appearanceRate: 0.0208, scoringEngineMentions: 1 }),
  false,
  "single-response ghost blocked"
);
assert.equal(
  meetsOverallBoardGate({ appearanceRate: 0.1, scoringEngineMentions: 1 }),
  true,
  "10% appearance passes"
);
assert.equal(
  meetsOverallBoardGate({ appearanceRate: 0.05, scoringEngineMentions: 2 }),
  true,
  "2 engines pass even if appearance low"
);
assert.equal(
  meetsOverallBoardGate({ appearanceRate: 0.099, scoringEngineMentions: 1 }),
  false,
  "just under 10% with 1 engine blocked"
);

console.log("verify-overall-gate: ok");
