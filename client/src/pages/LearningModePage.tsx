import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdaptiveToggle } from "../components/learning/AdaptiveToggle";
import { LearningModeSkeleton } from "../components/learning/LearningModeSkeleton";
import { ModeSelectionError } from "../components/learning/ModeSelectionError";
import { ModeSelector } from "../components/learning/ModeSelector";
import { StartLessonButton } from "../components/learning/StartLessonButton";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/ErrorState";
import { useLearningMode } from "../hooks/useLearningMode";
import { useStudentMeta } from "../hooks/useStudentMeta";
import { learningApi } from "../services/learningApi";
import { ApiError } from "../types";
import "../components/common/common.css";
import "../components/learning/learning.css";

interface ShellContext {
  openMenu: () => void;
}

export function LearningModePage() {
  const { materialId } = useParams();
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { setMeta } = useStudentMeta();
  const {
    data,
    loading,
    error,
    selectedMode,
    adaptiveEnabled,
    chooseMode,
    toggleAdaptive,
    reload,
  } = useLearningMode(materialId);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const startingLock = useRef(false);

  useEffect(() => {
    if (!data) return;
    setMeta({
      pageReady: {
        title: data.material.title,
        pageNumber: data.material.pageNumber,
        conceptCount: data.material.conceptCount,
        wordCount: data.material.wordCount,
      },
    });
    return () => setMeta({ pageReady: null });
  }, [data, setMeta]);

  const startLesson = async () => {
    if (!materialId || !selectedMode || startingLock.current) return;
    startingLock.current = true;
    setStarting(true);
    setStartError(null);
    try {
      const result = await learningApi.selectMode(materialId, {
        modeCode: selectedMode,
        adaptiveEnabled,
        startLesson: true,
      });
      navigate(`/lesson/${result.sessionId}`);
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : "تعذر بدء جلسة التعلم.");
      startingLock.current = false;
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return <LearningModeSkeleton />;
  }

  if (!data) {
    return (
      <ErrorState
        title="تعذر فتح اختيار طريقة الشرح."
        message={error ?? "لم يتم العثور على الصفحة."}
        onRetry={() => void reload()}
      />
    );
  }

  return (
    <div className="learning-mode-page">
      <header className="learning-mode-header">
        <div>
          <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>
            القائمة
          </Button>
          <h1>كيف تحب أن أشرح لك؟</h1>
          <p className="muted">يمكنك تغيير الطريقة في أي وقت أثناء الدرس</p>
        </div>
        <div className="learning-mode-actions">
          <AdaptiveToggle enabled={adaptiveEnabled} onChange={toggleAdaptive} />
          <StartLessonButton
            loading={starting}
            disabled={!selectedMode}
            onClick={() => void startLesson()}
          />
        </div>
      </header>

      {data.recommendationError ? (
        <ModeSelectionError message="تعذر تحديد الطريقة الأنسب تلقائيًا." />
      ) : null}

      {data.recommendation &&
      data.recommendation.recommendedMode !== "adaptive" &&
      !data.recommendationError ? (
        <p className="mode-hint" role="status">
          {data.recommendation.reasonText}
        </p>
      ) : null}

      <ModeSelector
        modes={data.modes}
        selectedMode={selectedMode}
        recommendation={data.recommendation}
        isNewLearner={data.student.isNewLearner || Boolean(data.recommendation?.isNewLearner)}
        onSelect={chooseMode}
      />

      {startError ? (
        <p className="status-err" role="alert">
          {startError}
        </p>
      ) : null}

      <div className="learning-mode-footer">
        <Button
          variant="text"
          type="button"
          onClick={() => navigate(`/lesson/${data.material.id}/analyze`)}
        >
          العودة إلى تحليل الصفحة
        </Button>
        <StartLessonButton
          loading={starting}
          disabled={!selectedMode}
          onClick={() => void startLesson()}
        />
      </div>
    </div>
  );
}
