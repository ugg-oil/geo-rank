import { writeFileSync } from "node:fs";

const PORT = 9333;
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((r) => ws.addEventListener("open", r));
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
function send(method, params = {}) {
  const mid = ++id;
  return new Promise((res, rej) => {
    pending.set(mid, (m) => (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)));
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true })).result.value;

const [url, out, theme = "dark", width = "1280"] = process.argv.slice(2);
await send("Emulation.setDeviceMetricsOverride", {
  width: Number(width),
  height: 1200,
  deviceScaleFactor: 2,
  mobile: false,
});
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: theme }],
});
await send("Page.enable");
await send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, 3500));

const clip = JSON.parse(
  await evaluate(`(() => {
    const svg = document.querySelector('svg[role="img"]');
    const card = svg.closest('div[aria-labelledby]');
    const r = card.getBoundingClientRect();
    return JSON.stringify({
      x: Math.max(0, Math.floor(r.x + window.scrollX) - 10),
      y: Math.floor(r.y + window.scrollY) - 10,
      width: Math.ceil(r.width) + 20,
      height: Math.ceil(r.height) + 20,
    });
  })()`)
);
const shot = await send("Page.captureScreenshot", {
  format: "png",
  clip: { ...clip, scale: 1 },
  captureBeyondViewport: true,
});
writeFileSync(out, Buffer.from(shot.data, "base64"));
ws.close();
console.log("wrote", out);
process.exit(0);
