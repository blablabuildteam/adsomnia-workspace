"use client";

import { useEffect, useState } from "react";
import { loadProductionEpicTasks } from "@/app/(workspace)/pipeline/production/actions";
import type { ProductionTask } from "@/lib/production/health";

export type EpicTasksByKey = Record<string, ProductionTask[]>;

const cache = new Map<number, EpicTasksByKey>();
const inflight = new Map<number, Promise<EpicTasksByKey>>();
let epoch = 0;

export function invalidateProductionEpicTaskCache() {
  epoch += 1;
  cache.clear();
  inflight.clear();
}

export function useProductionEpicTasks(
  projectId: number | null,
  enabled: boolean,
) {
  const [tasksByEpic, setTasksByEpic] = useState<EpicTasksByKey | null>(() =>
    projectId != null ? (cache.get(projectId) ?? null) : null,
  );
  const [loading, setLoading] = useState(
    Boolean(enabled && projectId != null && !cache.has(projectId ?? -1)),
  );
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!enabled || projectId == null) {
      setLoading(false);
      return;
    }

    const cached = cache.get(projectId);
    if (cached) {
      setTasksByEpic(cached);
      setLoading(false);
      setError(undefined);
      return;
    }

    const started = epoch;
    setLoading(true);
    setError(undefined);

    let pending = inflight.get(projectId);
    if (!pending) {
      pending = loadProductionEpicTasks(projectId)
        .then((result) => {
          if (result.error) throw new Error(result.error);
          cache.set(projectId, result.byEpic);
          return result.byEpic;
        })
        .finally(() => {
          inflight.delete(projectId);
        });
      inflight.set(projectId, pending);
    }

    let cancelled = false;
    pending
      .then((byEpic) => {
        if (cancelled || started !== epoch) return;
        setTasksByEpic(byEpic);
      })
      .catch((err: unknown) => {
        if (cancelled || started !== epoch) return;
        setError(
          err instanceof Error ? err.message : "Could not load tickets.",
        );
      })
      .finally(() => {
        if (!cancelled && started === epoch) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, enabled]);

  return { tasksByEpic, loading, error };
}
