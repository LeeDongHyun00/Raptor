import type { Run } from "./types";

/** "4.2초" under a minute, "1분 12초" above. */
export function fmtDuration(ms: number): string {
  const sec = Math.max(0, ms) / 1000;
  if (sec < 60) return `${sec < 10 ? sec.toFixed(1) : Math.round(sec)}초`;
  return `${Math.floor(sec / 60)}분 ${Math.round(sec % 60)}초`;
}

const at = (iso: string) => new Date(iso).getTime();

/** Time each log entry took: from the previous entry (or the start of the run) to this one. */
export function logDurations(run: Run): number[] {
  return run.logs.map((l, i) => at(l.at) - at(i === 0 ? run.createdAt : run.logs[i - 1].at));
}

/** Time spent per pipeline step; a step logged more than once (several fix rounds) is summed. */
export function stepDurations(run: Run): Record<string, number> {
  const out: Record<string, number> = {};
  logDurations(run).forEach((ms, i) => { out[run.logs[i].step] = (out[run.logs[i].step] ?? 0) + ms; });
  return out;
}

/** Start of the run to its last recorded step. */
export function totalDuration(run: Run): number | null {
  const last = run.logs[run.logs.length - 1];
  return last ? at(last.at) - at(run.createdAt) : null;
}
