import { AsyncLocalStorage } from "node:async_hooks";
import Anthropic from "@anthropic-ai/sdk";
import { getAsset } from "./store";
import { setAiContext } from "./aiEngine";

/**
 * Server wiring for the AI engine. The key comes from the environment when the deployment
 * has one; otherwise from the viewer, who enters it on the site and sends it with each
 * request. A viewer key lives only for that request (AsyncLocalStorage), never in a global.
 */

export const KEY_HEADER = "x-anthropic-key";

const hasEnvKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const requestKey = new AsyncLocalStorage<string>();

let envClient: Anthropic | null = null;

setAiContext({
  client: () => {
    const key = requestKey.getStore();
    // The server's own key wins: a deployment that has one never spends a visitor's key.
    if (hasEnvKey || !key) return (envClient ??= new Anthropic());
    return new Anthropic({ apiKey: key });
  },
  live: () => hasEnvKey || !!requestKey.getStore(),
  getAsset,
});

/** Whether the server itself holds a key (what the site reports before any viewer key). */
export const serverAiMode: "live" | "demo" = hasEnvKey ? "live" : "demo";

/** AI mode for the request being handled, counting a viewer-supplied key. */
export const aiMode = (): "live" | "demo" => (hasEnvKey || requestKey.getStore() ? "live" : "demo");

/**
 * Runs `fn` with the viewer's key from the request, if any. Returns a runner so work
 * scheduled after the response (the generation pipeline) keeps the same key.
 */
export function withViewerKey(req: Request): <T>(fn: () => Promise<T>) => Promise<T> {
  const key = req.headers.get(KEY_HEADER)?.trim();
  return (fn) => (key && /^[\w-]{20,300}$/.test(key) ? requestKey.run(key, fn) : fn());
}

export * from "./aiEngine";
