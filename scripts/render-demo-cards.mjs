// Pre-renders card PNGs for the sample topics into public/demo-cards/<topic>/<n>.png.
// The static GitHub Pages build has no server to render them on demand.
// Usage: start the app in demo mode (no API keys), then `npm run render:demo-cards`.
// Note: clears the generation history of the instance it talks to.
import { mkdir, writeFile, rm } from "node:fs/promises";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = new URL("../public/demo-cards/", import.meta.url);
const json = async (path, init) => (await fetch(base + path, init)).json();

const post = (path, body) => json(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function finishedRun() {
  const { id } = await json("/api/runs", { method: "POST" });
  let run;
  do {
    await new Promise((r) => setTimeout(r, 300));
    ({ run } = await json(`/api/runs/${id}`));
  } while (run.status === "running");
  return run;
}

async function save(url, file) {
  const res = await fetch(base + url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

await json("/api/runs", { method: "DELETE" });
await json("/api/voc", { method: "DELETE" });
await rm(out, { recursive: true, force: true });

const put = (path, body) => json(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// One full set per card design, since the static site cannot recolor PNGs.
for (const design of ["forest", "navy", "warm"]) {
  await json("/api/runs", { method: "DELETE" });
  await json("/api/voc", { method: "DELETE" });
  await put("/api/workspace", { settings: { design } });

  // Pass 1: trend-only plans — every card and banner.
  for (let topic = 0; ; topic++) {
    const run = await finishedRun();
    // Sample topics never repeat, so the first failed run means they are all rendered.
    if (run.status === "failed") break;
    if (run.aiMode !== "demo") throw new Error("Run the app without ANTHROPIC_API_KEY to render the sample cards.");
    const dir = new URL(`${design}/${topic}/`, out);
    await mkdir(dir, { recursive: true });
    for (let n = 0; n < run.cards.slides.length; n++) await save(`/api/runs/${run.id}/cards/${n}`, new URL(`${n}.png`, dir));
    for (let n = 0; n < run.channels.kakao.length; n++) await save(`/api/runs/${run.id}/banners/${n}`, new URL(`banner-${n}.png`, dir));
    console.log(`${design} topic ${topic}: ${run.cards.slides.length} cards, ${run.channels.kakao.length} banners — ${run.plan.topic}`);
  }

  // Pass 2: plans that answer a customer question — only the cover differs.
  await json("/api/runs", { method: "DELETE" });
  await post("/api/voc", { sample: true });
  for (let topic = 0; ; topic++) {
    const run = await finishedRun();
    if (run.status === "failed") break;
    await save(`/api/runs/${run.id}/cards/0`, new URL(`${design}/${topic}/voc-0.png`, out));
    console.log(`${design} topic ${topic}: question cover — ${run.plan.customerQuestion}`);
  }
}

await put("/api/workspace", { settings: { design: "forest" } });
await json("/api/runs", { method: "DELETE" });
await json("/api/voc", { method: "DELETE" });
