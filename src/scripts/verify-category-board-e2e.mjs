/**
 * P2 category-board interaction suite over Chrome DevTools Protocol.
 * Zero npm deps — uses Node's built-in WebSocket + fetch.
 *
 * Prefer: `yarn pipeline:category-board-e2e` (starts Chrome + prod server).
 * Against an already-running server:
 *   BASE=http://localhost:3000 CDP=http://127.0.0.1:9222 node src/scripts/verify-category-board-e2e.mjs
 *
 * Gotchas baked into the harness (do not "simplify" these away):
 * - Headless tabs get `visibilityState: hidden`, which starves React hydration.
 *   Always enable Emulation.setFocusEmulationEnabled + Chrome anti-background flags.
 * - Wait for React fiber keys on board nodes, not document.readyState
 *   (dev HMR keeps readyState at "loading").
 * - Scope DOM helpers to the *first* table (Also-mentioned is a second table).
 * - Use real CDP mouse/touch events; synthetic mouseenter does not fire React handlers.
 * - Prefer production `next start` over `next dev` for stable hydration under load.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const CDP = process.env.CDP ?? "http://127.0.0.1:9222";

const fails = [];
let count = 0;
function check(name, cond, extra = "") {
  count++;
  console.log((cond ? "  PASS  " : "  FAIL  ") + name + (cond ? "" : `   [${extra}]`));
  if (!cond) fails.push(name);
}

const targets = await (await fetch(`${CDP}/json/list`)).json();
let page = targets.find((t) => t.type === "page");
if (!page) {
  page = await (await fetch(`${CDP}/json/new?about:blank`, { method: "PUT" })).json();
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let id = 0;
const pending = new Map();
const consoleErrors = [];
ws.onmessage = (evt) => {
  const msg = JSON.parse(evt.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
  }
  if (msg.method === "Runtime.exceptionThrown") {
    consoleErrors.push(msg.params.exceptionDetails.text);
  }
};

function send(method, params = {}) {
  const msgId = ++id;
  ws.send(JSON.stringify({ id: msgId, method, params }));
  return new Promise((res) => pending.set(msgId, res));
}

// Helpers scoped to the *board* table (the page also renders Also-mentioned).
const HELPERS = `
  const board = () => document.querySelectorAll('table')[0];
  const T = {
    rows: () => [...board().querySelectorAll('tbody tr')],
    header: (label) => [...board().querySelectorAll('thead button')]
      .find(b => (b.getAttribute('aria-label') || '').startsWith('Sort by ' + label)),
    tips: () => [...board().querySelectorAll('thead button[data-tip]')],
    colIndex: (label) => [...board().querySelectorAll('thead th')]
      .findIndex(th => th.textContent.trim().toLowerCase().startsWith(label.toLowerCase())),
    col: (label) => {
      const i = T.colIndex(label);
      return i < 0 ? [] : T.rows().map(tr => tr.children[i]?.textContent.trim());
    },
    ranks: () => T.rows().map(tr => Number(tr.children[1].textContent.trim())),
    brands: () => T.rows().map(tr => tr.children[2].textContent.trim()),
    boxes: () => T.rows().map(tr => tr.querySelector('input[type=checkbox]')),
    btn: (label) => [...document.querySelectorAll('button')]
      .find(b => b.textContent.trim() === label),
    quadrantText: () => {
      const h = [...document.querySelectorAll('h2')].find(x => /Competitive landscape|竞争象限/.test(x.textContent));
      return h ? h.closest('div[aria-labelledby]').textContent : '';
    },
    tray: () => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Compare');
      return b ? b.parentElement.textContent : '';
    },
  };
`;

/** Evaluate `expr` with the T helpers in scope (wrapped so it can re-run). */
async function ev(expr) {
  const res = await send("Runtime.evaluate", {
    expression: `(() => { ${HELPERS} return (${expr}); })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.result?.exceptionDetails) {
    throw new Error(
      `${res.result.exceptionDetails.exception?.description ?? res.result.exceptionDetails.text}\n  expr: ${expr}`
    );
  }
  return res.result.result.value;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Scroll the target into view, then move the real mouse onto it so React's
 * synthetic mouseenter fires. Off-screen coordinates hit nothing.
 */
async function centerOf(selectorExpr) {
  const box = await ev(`(() => {
    const el = ${selectorExpr};
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      inView: r.top >= 0 && r.bottom <= innerHeight,
    };
  })()`);
  if (!box) throw new Error(`target not found: ${selectorExpr}`);
  await wait(250); // let smooth scrolling settle before reading coordinates
  return await ev(`(() => {
    const r = (${selectorExpr}).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, inView: r.top >= 0 && r.bottom <= innerHeight };
  })()`);
}

async function hover(selectorExpr) {
  const box = await centerOf(selectorExpr);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y, buttons: 0 });
  await wait(350);
  return box;
}

/** Mouse click (desktop): hover has already selected the point. */
async function click(selectorExpr) {
  const box = await centerOf(selectorExpr);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y, buttons: 0 });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
  await wait(500);
  return box;
}

/** Real touch tap (no hover beforehand) — the mobile path P2-4 must support. */
async function touchTap(selectorExpr) {
  const box = await centerOf(selectorExpr);
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x, y: box.y }],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await wait(500);
  return box;
}

await send("Runtime.enable");
await send("Page.enable");
// Headless targets get marked occluded/hidden after a while, which starves
// React's hydration scheduler. Force the page to always consider itself focused.
await send("Emulation.setFocusEmulationEnabled", { enabled: true });

/**
 * React attaches a `__reactFiber$…` key to hydrated DOM nodes; SSR markup has
 * none. Waiting on the *chart* being hydrated is what makes clicks land.
 */
// Note: dev server keeps readyState at "loading" (HMR socket), so don't gate on it.
const HYDRATED = `(() => {
  const hydrated = (el) => !!el && Object.keys(el).some(k => k.startsWith('__react'));
  return hydrated(document.querySelector('tbody input[type=checkbox]'))
    && hydrated(document.querySelector('svg a circle'));
})()`;

/**
 * Navigate and wait for hydration. The dev server occasionally fails to deliver
 * client chunks on repeated hard navigations (SSR markup is fine, React never
 * attaches), so retry the navigation rather than reporting a product failure.
 */
async function goto(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    consoleErrors.length = 0;
    // A backgrounded/occluded target starves React's hydration scheduler, so
    // keep the tab foregrounded and awake across navigations.
    await send("Page.bringToFront");
    await send("Page.setWebLifecycleState", { state: "active" }).catch(() => {});
    await send("Page.navigate", { url });
    for (let i = 0; i < 40; i++) {
      await wait(250);
      if (await ev(HYDRATED).catch(() => false)) return;
    }
    const diag = await ev(`(() => ({
      path: location.pathname + location.search,
      ready: document.readyState,
      visibility: document.visibilityState,
      hidden: document.hidden,
      scripts: document.querySelectorAll('script[src]').length,
      loadedJs: performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js')).length,
      failedJs: performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js') && r.transferSize === 0 && r.decodedBodySize === 0).length,
      boxes: document.querySelectorAll('tbody input[type=checkbox]').length,
      fiberKeys: Object.keys(document.querySelector('tbody input[type=checkbox]') ?? {}).length,
    }))()`).catch((e) => `diag threw ${e.message}`);
    console.log(`  (retry ${attempt}: no hydration in 10s) diag=${JSON.stringify(diag)} errors=${consoleErrors.slice(0, 2).join(" | ")}`);
  }
  throw new Error(`page never hydrated after 3 attempts: ${url}`);
}

console.log("=== P2 interaction tests (real Chrome, CDP) ===");
await goto(`${BASE}/category/ai-tools`);
check("page hydrates without console errors", consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | "));
check("board table has 20 rows", (await ev(`T.rows().length`)) === 20);

/* ---------- P2-1 sorting ---------- */
console.log("\nP2-1 sorting");
const publishedRanks = await ev(`T.ranks()`);
const publishedBrands = await ev(`T.brands()`);
check(
  "default order = published rank (score desc)",
  publishedRanks.join(",") === [...publishedRanks].sort((a, b) => a - b).join(","),
  publishedRanks.join(",")
);

await ev(`(T.header('Avg Rank').click(), true)`);
await wait(350);
const avgAsc = await ev(`T.col('Avg Rank').map(Number)`);
check(
  "Avg Rank click → ascending (smaller is better)",
  avgAsc.every((v, i) => i === 0 || avgAsc[i - 1] <= v),
  avgAsc.join(",")
);
const ranksAfter = await ev(`T.ranks()`);
check(
  "# column keeps published rank (reordered, not renumbered)",
  ranksAfter.join(",") !== publishedRanks.join(",") &&
    [...ranksAfter].sort((a, b) => a - b).join(",") === publishedRanks.join(","),
  ranksAfter.join(",")
);
check(
  "same 20 products, just reordered",
  [...(await ev(`T.brands()`))].sort().join("|") === [...publishedBrands].sort().join("|")
);

await ev(`(T.header('Avg Rank').click(), true)`);
await wait(350);
const avgDesc = await ev(`T.col('Avg Rank').map(Number)`);
check(
  "second click on same column flips direction",
  avgDesc.every((v, i) => i === 0 || avgDesc[i - 1] >= v),
  avgDesc.join(",")
);

await ev(`(T.header('Appearance').click(), true)`);
await wait(350);
const appDesc = await ev(`T.col('Appearance').map(s => parseFloat(s))`);
check(
  "switching column resets to its natural direction (desc)",
  appDesc.every((v, i) => i === 0 || appDesc[i - 1] >= v),
  appDesc.join(",")
);

await ev(`(T.header('Coverage').click(), true)`);
await wait(350);
const cov = await ev(`T.col('Coverage').map(s => s === '—' ? null : parseFloat(s))`);
const covReal = cov.filter((v) => v !== null);
check(
  "coverage sorts desc with nulls last",
  covReal.every((v, i) => i === 0 || covReal[i - 1] >= v) &&
    cov.slice(covReal.length).every((v) => v === null),
  cov.join(",")
);

await ev(`(T.header('Score').click(), true)`);
await wait(350);
const scoreDesc = await ev(`T.col('Score').map(Number)`);
check(
  "back to Score → desc, matches published order",
  scoreDesc.every((v, i) => i === 0 || scoreDesc[i - 1] >= v) &&
    (await ev(`T.ranks()`)).join(",") === publishedRanks.join(","),
  scoreDesc.join(",")
);

/* ---------- P2-1 tooltip ---------- */
console.log("\nP2-1 header tooltips");
// Fresh page: the sort clicks above leave a tooltip open (synthetic clicks fire
// no mouseleave), which would mask "nothing shows until asked".
await goto(`${BASE}/category/ai-tools`);
check("no tooltip until asked", (await ev(`document.querySelectorAll('[role=tooltip]').length`)) === 0);
const tipCount = await ev(`T.tips().length`);
check("every metric column explains itself (5 incl. Change)", tipCount === 5, `${tipCount} found`);
// Header labels must not wrap ("Avg Rank" used to break the row into two lines)
// and must all share one case, or the row looks ragged.
const HEAD_CELLS = `[...board().querySelectorAll('thead th:not(:has(span.sr-only))')]`;
check(
  "header cells never wrap",
  await ev(`${HEAD_CELLS}.every(th => getComputedStyle(th).whiteSpace === 'nowrap')`)
);
check(
  "header labels share one case",
  await ev(
    `[...${HEAD_CELLS}, ...board().querySelectorAll('thead button')].every(el => getComputedStyle(el).textTransform === 'uppercase')`
  )
);
await ev(`(T.tips()[2].click(), true)`);
await wait(300);
const tip = await ev(`document.querySelector('[role=tooltip]')?.textContent ?? ''`);
check("tapping a header opens a tooltip (touch-friendly)", tip.length > 15, tip.slice(0, 60));
check("avgRank tooltip explains direction", /lower is better/i.test(tip), tip.slice(0, 90));
await ev(`(document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true})), true)`);
await wait(300);
check("outside pointerdown dismisses tooltip", (await ev(`document.querySelectorAll('[role=tooltip]').length`)) === 0);

// Hover must work too (desktop path).
await hover(`T.tips()[3]`);
const hoverTip = await ev(`document.querySelector('[role=tooltip]')?.textContent ?? ''`);
check("hovering a header opens the tooltip", hoverTip.length > 15, hoverTip.slice(0, 60));
check("coverage tooltip says Overall-only", /overall board only/i.test(hoverTip), hoverTip.slice(0, 90));
check(
  "sorted column is marked for assistive tech",
  (await ev(
    `[...board().querySelectorAll('thead th[aria-sort]')].filter(th => th.getAttribute('aria-sort') !== 'none').length`
  )) === 1
);

/* ---------- P2-2 compare ---------- */
console.log("\nP2-2 compare selection");
await goto(`${BASE}/category/ai-tools`);
check("tray hidden with nothing selected", !(await ev(`!!T.btn('Compare')`)));
// The checkbox column alone is not discoverable — the toolbar must say so.
const toolbar = await ev(`board().parentElement.previousElementSibling?.textContent ?? ''`);
check(
  "compare is announced before anything is ticked",
  toolbar.includes("Compare products") && /Tick 2–3 rows/.test(toolbar),
  toolbar.slice(0, 80)
);

await ev(`(T.boxes()[0].click(), true)`);
await wait(300);
check("tray appears at 1/3", (await ev(`T.tray()`)).includes("1 of 3 selected"));
check("Compare disabled with 1 selected", (await ev(`T.btn('Compare')?.disabled`)) === true);
check("hint tells you to pick 2–3", (await ev(`T.tray()`)).includes("Tick 2–3 rows"));
check(
  "toolbar switches to a live count",
  (await ev(`board().parentElement.previousElementSibling?.textContent ?? ''`)).includes(
    "1 of 3 selected"
  )
);

await ev(`(T.boxes()[1].click(), true)`);
await wait(300);
check("Compare enabled at 2 selected", (await ev(`T.btn('Compare')?.disabled`)) === false);

await ev(`(T.boxes()[2].click(), true)`);
await wait(300);
check("counter reads 3/3", (await ev(`T.tray()`)).includes("3 of 3 selected"));
const disabled = await ev(`T.boxes().filter(b => b.disabled).length`);
check("unselected rows disabled at cap", disabled === 17, `${disabled} of 20 disabled`);
await ev(`(T.boxes()[7].click(), true)`);
await wait(300);
check("cannot select a 4th product", (await ev(`T.tray()`)).includes("3 of 3 selected"));

await ev(`(T.boxes()[2].click(), true)`);
await wait(300);
check("deselecting frees a slot (2/3)", (await ev(`T.tray()`)).includes("2 of 3 selected"));
await ev(`(T.boxes()[7].click(), true)`);
await wait(300);
check("can then select a different product (3/3)", (await ev(`T.tray()`)).includes("3 of 3 selected"));

console.log("\nP2-2 compare dialog");
await ev(`(T.btn('Compare').click(), true)`);
await wait(500);
check("dialog opens", (await ev(`document.querySelectorAll('[role=dialog]').length`)) === 1);
check("dialog is modal", await ev(`document.querySelector('[role=dialog]')?.getAttribute('aria-modal') === 'true'`));
const dlg = await ev(`document.querySelector('[role=dialog]')?.textContent ?? ''`);
for (const label of ["Score", "Appearance", "Avg Rank", "Coverage"]) {
  check(`dialog has ${label} row`, dlg.includes(label));
}
check("4 metric rows on Overall", (await ev(`document.querySelectorAll('[role=dialog] tbody tr').length`)) === 4);
check("3 products + label column", (await ev(`document.querySelectorAll('[role=dialog] thead th').length`)) === 4);
check("products link to brand pages", (await ev(`document.querySelectorAll('[role=dialog] thead a[href^="/brand/"]').length`)) === 3);
check("brand links carry ?from= back-reference", await ev(`[...document.querySelectorAll('[role=dialog] thead a')].every(a => a.getAttribute('href').includes('from='))`));
check("board + period labelled", /Overall · period \d{4}-\d{2}-\d{2}/.test(dlg), dlg.slice(0, 60));

// Best must mark max for score/appearance/coverage and min for avgRank (ties allowed).
const bestByRow = await ev(`
  (() => [...document.querySelectorAll('[role=dialog] tbody tr')].map(tr => ({
    metric: tr.children[0].textContent.trim(),
    cells: [...tr.children].slice(1).map(td => ({
      value: td.textContent.includes('—') ? null : parseFloat(td.textContent.replace('Best','').replace('%','')),
      best: td.textContent.includes('Best'),
    })),
  })))()
`);
for (const row of bestByRow) {
  const values = row.cells.map((c) => c.value).filter((v) => v !== null);
  const target = /avg/i.test(row.metric) ? Math.min(...values) : Math.max(...values);
  const flagged = row.cells.filter((c) => c.best).map((c) => c.value);
  check(
    `Best on ${row.metric} marks ${/avg/i.test(row.metric) ? "lowest" : "highest"} (ties ok)`,
    flagged.length >= 1 && flagged.every((v) => v === target),
    JSON.stringify(row.cells)
  );
}

await ev(`(document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})), true)`);
await wait(350);
check("Escape closes dialog", (await ev(`document.querySelectorAll('[role=dialog]').length`)) === 0);
check("selection survives closing", (await ev(`T.tray()`)).includes("3 of 3 selected"));
await ev(`(T.btn('Clear').click(), true)`);
await wait(300);
check("Clear empties tray", !(await ev(`!!T.btn('Compare')`)));

/* ---------- P2-2 engine tab ---------- */
console.log("\nP2-2 engine board");
await ev(`(T.boxes()[0].click(), T.boxes()[1].click(), true)`);
await wait(300);
await ev(`(T.btn('ChatGPT').click(), true)`);
await wait(600);
check("switching engine tab clears selection", !(await ev(`!!T.btn('Compare')`)));
check("coverage column gone on engine board", (await ev(`T.colIndex('Coverage')`)) === -1);
check("coverage sort control gone", (await ev(`!!T.header('Coverage')`)) === false);
check("other sort controls still there", await ev(`!!T.header('Avg Rank') && !!T.header('Score')`));

await ev(`(T.boxes()[0].click(), T.boxes()[1].click(), true)`);
await wait(300);
await ev(`(T.btn('Compare').click(), true)`);
await wait(500);
const engineDlg = await ev(`document.querySelector('[role=dialog]')?.textContent ?? ''`);
check("engine dialog omits Coverage row", !engineDlg.includes("Coverage"));
check("3 metric rows on engine board", (await ev(`document.querySelectorAll('[role=dialog] tbody tr').length`)) === 3);
check("dialog labels the engine board", /ChatGPT · period \d{4}-\d{2}-\d{2}/.test(engineDlg), engineDlg.slice(0, 60));
await ev(`(document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})), true)`);
await wait(300);

/* ---------- P2-4 quadrant ---------- */
console.log("\nP2-4 quadrant");
await goto(`${BASE}/category/ai-tools`);
check("quadrant renders points", (await ev(`document.querySelectorAll('svg circle').length`)) > 20);
const colours = await ev(
  `[...new Set([...document.querySelectorAll('svg circle')].map(c => c.getAttribute('fill')).filter(f => f && f !== 'transparent'))]`
);
check("points coloured per quadrant", colours.length > 1, colours.join(" "));
// Quadrants read from coloured corner labels, not tinted blocks.
check(
  "four quadrant corner labels coloured",
  (await ev(
    `[...new Set([...document.querySelectorAll('svg text[fill^="var(--q-"]')].map(t => t.getAttribute('fill')))].length`
  )) === 4
);
check("axis ticks show real ranks", await ev(`/^#\\d+$/.test([...document.querySelectorAll('svg text')].map(t => t.textContent.trim()).find(t => t.startsWith('#')) || '')`));
const qText = await ev(`T.quadrantText()`);
for (const n of ["Leaders", "Challengers", "Niche", "Laggards"]) {
  check(`quadrant names ${n}`, qText.includes(n));
}
check("legend explains frequency/position", qText.includes("High frequency") && qText.includes("Lower position"));

// The selected-point line is the sibling right after the chart's <svg>.
const METRICS_LINE = `document.querySelector('[aria-labelledby] svg')?.nextElementSibling`;
check("metrics line empty before hover", (await ev(`${METRICS_LINE}?.textContent.trim()`)) === "");

const hoverBox = await hover(`document.querySelector('svg a circle')`);
check("chart scrolled into view for hovering", hoverBox.inView, JSON.stringify(hoverBox));
const metricsLine = await ev(`${METRICS_LINE}?.textContent ?? ''`);
check("hover reveals brand + metrics", /mention rate · avg #\d/.test(metricsLine), JSON.stringify(metricsLine));
check("metrics line names the quadrant", /Leaders|Challengers|Niche|Laggards/.test(metricsLine), JSON.stringify(metricsLine));
check("metrics line links to the brand", await ev(`!!${METRICS_LINE}?.querySelector('a[href^="/brand/"]')`));

/* ---------- P2-5 movement ---------- */
console.log("\nP2-5 movement overlay");
const linesBefore = await ev(`document.querySelectorAll('svg line').length`);
check("median crosshairs only before toggle", linesBefore === 2, `${linesBefore} lines`);
check("toggle starts unpressed", (await ev(`T.btn('Show movement')?.getAttribute('aria-pressed')`)) === "false", String(await ev(`T.btn('Show movement')?.getAttribute('aria-pressed')`)));
await ev(`(T.btn('Show movement').click(), true)`);
await wait(600);
const pressed = await ev(`T.btn('Show movement')?.getAttribute('aria-pressed')`);
check("toggle reports pressed state", pressed === "true", String(pressed));
const linesAfter = await ev(`document.querySelectorAll('svg line').length`);
check("toggle draws movement arrows", linesAfter > linesBefore, `${linesBefore} → ${linesAfter} lines`);
check("arrow marker defined", (await ev(`document.querySelectorAll('svg marker').length`)) === 1);
check("arrows use the marker", await ev(`[...document.querySelectorAll('svg line')].some(l => (l.getAttribute('marker-end') || '').includes('arrow'))`));
const faded = await ev(`document.querySelectorAll('svg circle[opacity="0.28"]').length`);
check("faded prior-period dots drawn", faded > 0, `${faded} faded dots`);
check("one faded dot per arrow", faded === linesAfter - linesBefore, `${faded} dots vs ${linesAfter - linesBefore} arrows`);
check("hint explains the overlay", (await ev(`T.quadrantText()`)).includes("Faded dot"));
await ev(`(T.btn('Show movement').click(), true)`);
await wait(400);
check("toggle off removes arrows", (await ev(`document.querySelectorAll('svg line').length`)) === linesBefore);
check("toggle off removes faded dots", (await ev(`document.querySelectorAll('svg circle[opacity="0.28"]').length`)) === 0);

console.log("\nP2-4 point activation");
// Desktop: hover already selected the point, so a click follows the link.
await click(`document.querySelectorAll('svg a circle')[0]`);
check("hover + click goes to the brand page", await ev(`location.pathname.startsWith('/brand/')`), await ev(`location.pathname`));

// Touch: no hover, so the first tap must only select (P2-4 mobile requirement).
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
await goto(`${BASE}/category/ai-tools`);
await touchTap(`document.querySelectorAll('svg a circle')[3]`);
const tappedLine = await ev(`${METRICS_LINE}?.textContent ?? ''`);
check("first tap does not navigate", await ev(`location.pathname === '/category/ai-tools'`), await ev(`location.pathname`));
check("first tap reveals brand + metrics", /mention rate · avg #\d/.test(tappedLine), JSON.stringify(tappedLine));
// Dismissing the selection must require two taps again, not navigate instantly.
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 5, y: 5 }] });
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await wait(400);
check("tapping outside clears the selection", (await ev(`${METRICS_LINE}?.textContent.trim()`)) === "");
await touchTap(`document.querySelectorAll('svg a circle')[3]`);
check("after dismissing, first tap still only selects", await ev(`location.pathname === '/category/ai-tools'`), await ev(`location.pathname`));

await touchTap(`document.querySelectorAll('svg a circle')[3]`);
check("second tap navigates to the brand", await ev(`location.pathname.startsWith('/brand/')`), await ev(`location.pathname`));
await send("Emulation.setTouchEmulationEnabled", { enabled: false });

console.log("\nearliest period (no prior published period)");
await goto(`${BASE}/category/ai-tools?week=2026-07-06`);
check("no movement toggle offered", !(await ev(`!!T.btn('Show movement')`)));
check("quadrant still renders", (await ev(`document.querySelectorAll('svg circle').length`)) > 20);
check("table still sortable", (await ev(`!!T.header('Avg Rank')`)) === true);
check("no stray arrows", (await ev(`document.querySelectorAll('svg line').length`)) === 2);

console.log("\nconsole hygiene");
check("no console errors during interactions", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

console.log(`\n${count - fails.length}/${count} passed`);
if (fails.length) {
  console.log("FAILED:");
  fails.forEach((f) => console.log(" -", f));
  ws.close();
  process.exit(1);
}
ws.close();
process.exit(0);
