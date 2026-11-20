import Anthropic from "@anthropic-ai/sdk";
import type { PromoInput, PromoResult } from "./types";
import { aiMode } from "./ai";
import { demoPromo } from "./studioDemo";
import { requestPromo, type StudioDoc, type StudioPhoto } from "./studioCore";

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

export async function generatePromo(input: PromoInput, docs: StudioDoc[], photos: StudioPhoto[]): Promise<PromoResult> {
  if (aiMode === "demo") return demoPromo(input, photos.length);
  return requestPromo(anthropic(), input, docs, photos);
}
