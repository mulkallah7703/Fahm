import { ANALYSIS_POLL_LOCK_MS, emptyStages, type AnalysisStatus } from "../../config/analysis.js";
import type { AnalysisDto } from "../../types/analysis.js";

interface JobRecord {
  snapshot: AnalysisDto;
  running: boolean;
  updatedAt: number;
}

const jobs = new Map<string, JobRecord>();

export const analysisJobStore = {
  get(materialId: string): AnalysisDto | null {
    const job = jobs.get(materialId);
    if (!job) return null;
    if (Date.now() - job.updatedAt > ANALYSIS_POLL_LOCK_MS) {
      jobs.delete(materialId);
      return null;
    }
    return job.snapshot;
  },

  isRunning(materialId: string): boolean {
    const job = jobs.get(materialId);
    return Boolean(job?.running);
  },

  start(snapshot: AnalysisDto): void {
    jobs.set(snapshot.material.id, {
      snapshot: {
        ...snapshot,
        status: snapshot.status === "pending" ? "ocr_processing" : snapshot.status,
        stages: snapshot.stages.length ? snapshot.stages : emptyStages(),
      },
      running: true,
      updatedAt: Date.now(),
    });
  },

  update(materialId: string, patch: Partial<AnalysisDto>): AnalysisDto | null {
    const current = jobs.get(materialId);
    if (!current) return null;
    current.snapshot = { ...current.snapshot, ...patch };
    current.updatedAt = Date.now();
    return current.snapshot;
  },

  finish(materialId: string, snapshot: AnalysisDto): void {
    jobs.set(materialId, {
      snapshot,
      running: snapshot.status === "failed" ? false : snapshot.status !== "completed",
      updatedAt: Date.now(),
    });
    if (snapshot.status === "completed" || snapshot.status === "failed") {
      jobs.set(materialId, {
        snapshot,
        running: false,
        updatedAt: Date.now(),
      });
    }
  },

  clear(materialId: string): void {
    jobs.delete(materialId);
  },
};

export function setStage(
  snapshot: AnalysisDto,
  key: AnalysisDto["stages"][number]["key"],
  state: AnalysisDto["stages"][number]["state"],
  message: string | null,
  status?: AnalysisStatus,
): AnalysisDto {
  return {
    ...snapshot,
    status: status ?? snapshot.status,
    stages: snapshot.stages.map((stage) =>
      stage.key === key ? { ...stage, state, message } : stage,
    ),
  };
}
