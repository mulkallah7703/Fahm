import { useEffect, useState } from "react";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { motion } from "framer-motion";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { LearningPulseCard } from "../components/dashboard/LearningPulseCard";
import { PasteTextModal } from "../components/dashboard/PasteTextModal";
import { QuickActionCard } from "../components/dashboard/QuickActionCard";
import { RecentLessons } from "../components/dashboard/RecentLessons";
import { RecommendationCard } from "../components/dashboard/RecommendationCard";
import { UploadCard } from "../components/dashboard/UploadCard";
import { ErrorState } from "../components/common/ErrorState";
import { Skeleton } from "../components/common/Skeleton";
import { useDashboard } from "../hooks/useDashboard";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useStudentMeta } from "../hooks/useStudentMeta";
import { firstNameOf, greetingForHour } from "../utils/greeting";
import { conceptCountLabel, reviewCountLabel } from "../utils/format";
import "../components/common/common.css";
import "../components/dashboard/dashboard.css";

interface ShellContext {
  openMenu: () => void;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { openMenu } = useOutletContext<ShellContext>();
  const { data, loading, error, reload } = useDashboard();
  const { setMeta } = useStudentMeta();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [pasteOpen, setPasteOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    setMeta({
      displayName: data.student.displayName,
      gradeLevel: data.student.gradeLevel,
      preferredMode: data.student.preferredLearningMode,
      preferredModeName: data.student.preferredLearningModeName,
    });
  }, [data, setMeta]);

  if (user?.role === "teacher") return <Navigate to="/teacher" replace />;

  if (loading) {
    return (
      <div>
        <Skeleton height="36px" width="240px" />
        <div style={{ height: 18 }} />
        <Skeleton height="220px" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? "تعذر تحميل بيانات التعلم."} onRetry={() => void reload()} />;
  }

  const greeting = `${greetingForHour(new Date().getHours())}، ${firstNameOf(
    data.student.displayName,
    data.student.firstName,
  )}`;

  const continueText = data.continueLearning
    ? `${data.continueLearning.title}${
        data.continueLearning.stoppedAtConcept
          ? ` — توقفت عند ${data.continueLearning.stoppedAtConcept}.`
          : data.continueLearning.pageNumber
            ? ` — صفحة ${data.continueLearning.pageNumber}.`
            : "."
      }`
    : "لا يوجد درس غير مكتمل حالياً.";

  const enter = reduceMotion
    ? undefined
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div {...enter} transition={{ duration: 0.35 }}>
      <DashboardHeader greeting={greeting} onOpenMenu={openMenu} />
      <div className="dashboard-layout">
        <div>
          <UploadCard onUploaded={() => void reload()} />
          <div className="quick-actions">
            <QuickActionCard
              kicker="PASTE TEXT"
              title="إدخال نص"
              description="الصق نصًا من درس أو ملزمة."
              onClick={() => setPasteOpen(true)}
            />
            <QuickActionCard
              kicker="CONTINUE"
              title="أكمل الدرس"
              description={
                data.continueLearning
                  ? `${continueText} ${conceptCountLabel(data.continueLearning.conceptCount)}`
                  : continueText
              }
              onClick={() =>
                data.continueLearning?.materialId
                  ? navigate(`/lesson/${data.continueLearning.materialId}/mode`)
                  : document.getElementById("upload-card")?.scrollIntoView({ behavior: "smooth" })
              }
            />
            <QuickActionCard
              kicker="REVIEW"
              title="مراجعة الضعيف"
              description={reviewCountLabel(data.reviewConcepts.length)}
              onClick={() => navigate("/review")}
            />
          </div>
          <RecentLessons lessons={data.recentLessons} />
        </div>
        <aside className="insights">
          <LearningPulseCard pulse={data.learningPulse} concepts={data.reviewConcepts} />
          <RecommendationCard recommendation={data.recommendation} />
        </aside>
      </div>
      <PasteTextModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onCreated={() => void reload()}
      />
    </motion.div>
  );
}
