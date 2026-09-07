import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import type { Recommendation } from "../../types";

interface Props {
  recommendation: Recommendation | null;
}

export function RecommendationCard({ recommendation }: Props) {
  const navigate = useNavigate();
  if (!recommendation) return null;

  const onAction = () => {
    if (recommendation.action === "review") {
      navigate("/review");
      return;
    }
    if (recommendation.action === "continue" && recommendation.materialId) {
      navigate(`/lesson/${recommendation.materialId}/mode`);
      return;
    }
    document.getElementById("upload-card")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Card className="reco-card" aria-label="اقتراح فَهْم">
      <p>{recommendation.text}</p>
      <Button variant="ghost" type="button" onClick={onAction}>
        {recommendation.action === "upload" ? "ابدأ الآن" : "ابدأ المراجعة"}
      </Button>
    </Card>
  );
}
