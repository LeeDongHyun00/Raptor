// Pre-renders card PNGs for the sample topics into public/demo-cards/<topic>/<n>.png.
// The static GitHub Pages build has no server to render them on demand.
// Usage: start the app in demo mode (no API keys), then `npm run render:demo-cards`.
// Note: clears the generation history of the instance it talks to.
import { mkdir, writeFile, rm } from "node:fs/promises";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = new URL("../public/demo-cards/", import.meta.url);
const json = async (path, init) => (await fetch(base + path, init)).json();

await json("/api/runs", { method: "DELETE" });
await rm(out, { recursive: true, force: true });

for (let topic = 0; ; topic++) {
  const { id } = await json("/api/runs", { method: "POST" });
  let run;
  do {
    await new Promise((r) => setTimeout(r, 300));
    ({ run } = await json(`/api/runs/${id}`));
  } while (run.status === "running");
  // Sample topics never repeat, so the first failed run means they are all rendered.
  if (run.status === "failed") break;
  if (run.aiMode !== "demo") throw new Error("Run the app without ANTHROPIC_API_KEY to render the sample cards.");
  const dir = new URL(`${topic}/`, out);
  await mkdir(dir, { recursive: true });
  for (let n = 0; n < run.cards.slides.length; n++) {
    const res = await fetch(`${base}/api/runs/${id}/cards/${n}`);
    if (!res.ok) throw new Error(`card ${topic}/${n}: HTTP ${res.status}`);
    await writeFile(new URL(`${n}.png`, dir), Buffer.from(await res.arrayBuffer()));
  }
  console.log(`topic ${topic}: ${run.cards.slides.length} cards — ${run.plan.topic}`);
}

await json("/api/runs", { method: "DELETE" });
