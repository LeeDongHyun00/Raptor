import type { Run } from "./types";
import { addRun, getRuns, getWorkspace, saveWorkspace, updateRun } from "./store";
import { aiMode, describeScreenshots, planTopic, reviewMissions, reviseBlog, writeBlog, writeCards, writeChannels } from "./ai";
import { collectTrends, trendMode } from "./trends";
import { newRun, runPipeline } from "./pipelineCore";

export { INTERVAL_DAYS, STEPS, nextRunAt } from "./pipelineCore";

export async function createRun(trigger: Run["trigger"]): Promise<Run> {
  const run = newRun(trigger, aiMode, trendMode);
  await addRun(run);
  return run;
}

export function executeRun(runId: string): Promise<void> {
  return runPipeline(runId, {
    getWorkspace, saveWorkspace, getRuns, updateRun, collectTrends,
    describeScreenshots, planTopic, writeBlog, writeCards, writeChannels, reviewMissions, reviseBlog,
  });
}
