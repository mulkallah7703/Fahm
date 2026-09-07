import { useCallback, useEffect, useRef, useState } from "react";
import { learningApi } from "../services/learningApi";
import { ApiError, type LearningModeCode, type LearningSetup } from "../types";

export function useLearningMode(materialId: string | undefined) {
  const [data, setData] = useState<LearningSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<LearningModeCode | null>(null);
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(true);
  const persistTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!materialId) {
      setError("معرف المادة غير صالح.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const setup = await learningApi.setup(materialId);
      setData(setup);
      setSelectedMode(
        setup.session.selectedMode ??
          setup.recommendation?.recommendedMode ??
          "adaptive",
      );
      setAdaptiveEnabled(setup.session.adaptiveEnabled);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر تحميل طرق الشرح.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    (mode: LearningModeCode, adaptive: boolean) => {
      if (!materialId) return;
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => {
        void learningApi
          .selectMode(materialId, { modeCode: mode, adaptiveEnabled: adaptive })
          .catch(() => undefined);
      }, 200);
    },
    [materialId],
  );

  const chooseMode = useCallback(
    (mode: LearningModeCode) => {
      setSelectedMode(mode);
      persist(mode, adaptiveEnabled);
    },
    [adaptiveEnabled, persist],
  );

  const toggleAdaptive = useCallback(
    (enabled: boolean) => {
      setAdaptiveEnabled(enabled);
      if (selectedMode) persist(selectedMode, enabled);
    },
    [persist, selectedMode],
  );

  return {
    data,
    loading,
    error,
    selectedMode,
    adaptiveEnabled,
    chooseMode,
    toggleAdaptive,
    reload: load,
  };
}
