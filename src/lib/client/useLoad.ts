"use client";

import { useCallback, useEffect, useState } from "react";
import { KEY_EVENT } from "./apiKeyStore";

/** Loads data on mount and exposes a reload function for after mutations. */
export function useLoad<T>(load: () => Promise<T>): { data: T | null; error: string; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    load()
      .then((d) => { if (alive) { setData(d); setError(""); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "불러오지 못했습니다."); });
    return () => { alive = false; };
    // `load` is expected to be stable for the lifetime of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  // Entering or removing the API key flips screens between demo and live, so reload on it.
  useEffect(() => {
    window.addEventListener(KEY_EVENT, reload);
    return () => window.removeEventListener(KEY_EVENT, reload);
  }, [reload]);
  return { data, error, reload };
}
