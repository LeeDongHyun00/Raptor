import { notFound } from "next/navigation";
import { getRun, getWorkspace } from "@/lib/store";
import { adDisclosure, AD_HASHTAG } from "@/lib/review";
import { RunView } from "@/components/RunView";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const run = await getRun((await params).id);
  if (!run) notFound();
  const ws = await getWorkspace();
  return (
    <RunView
      initial={run}
      disclosure={adDisclosure(ws)}
      adHashtag={AD_HASHTAG}
      differentiators={ws.differentiators.map((d) => ({ id: d.id, title: d.title }))}
    />
  );
}
