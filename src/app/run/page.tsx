import { Suspense } from "react";
import { RunScreen } from "@/components/screens/RunScreen";

export default function RunPage() {
  // useSearchParams needs a Suspense boundary so the page can be prerendered as a static shell.
  return (
    <Suspense fallback={null}>
      <RunScreen />
    </Suspense>
  );
}
