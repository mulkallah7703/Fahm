import { useParams } from "react-router-dom";
import { UploadCard } from "../components/dashboard/UploadCard";
import { LearningSessionPage } from "./LearningSessionPage";
import { PlaceholderPage } from "./PlaceholderPage";
import "../components/common/common.css";
import "../components/dashboard/dashboard.css";

export function LessonPage() {
  const { sessionId } = useParams();

  if (!sessionId || sessionId === "new") {
    return (
      <div className="page-placeholder">
        <PlaceholderPage
          kicker="LESSON"
          title="درس جديد"
          description="ارفع صفحة أو الصق نصاً لنبدأ تجربة التعلم."
        />
        <div style={{ height: 16 }} />
        <UploadCard />
      </div>
    );
  }

  return <LearningSessionPage />;
}
