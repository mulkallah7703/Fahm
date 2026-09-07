import type { CatalogMode, LearningModeCode, ModeRecommendation } from "../../types";
import { AdaptiveRecommendationCard } from "./AdaptiveRecommendationCard";
import { ModeCard } from "./ModeCard";

interface Props {
  modes: CatalogMode[];
  selectedMode: LearningModeCode | null;
  recommendation: ModeRecommendation | null;
  isNewLearner: boolean;
  onSelect: (code: LearningModeCode) => void;
}

export function ModeSelector({
  modes,
  selectedMode,
  recommendation,
  isNewLearner,
  onSelect,
}: Props) {
  const adaptive = modes.find((mode) => mode.code === "adaptive");
  const others = modes.filter((mode) => mode.code !== "adaptive");

  return (
    <div className="mode-selector" role="radiogroup" aria-label="طريقة الشرح">
      {adaptive ? (
        <AdaptiveRecommendationCard
          mode={adaptive}
          selected={selectedMode === "adaptive"}
          recommendation={recommendation}
          isNewLearner={isNewLearner}
          onSelect={() => onSelect("adaptive")}
        />
      ) : null}
      <div className="mode-grid">
        {others.map((mode) => (
          <ModeCard
            key={mode.code}
            mode={mode}
            selected={selectedMode === mode.code}
            reasonText={recommendation?.reasonText}
            onSelect={() => onSelect(mode.code)}
          />
        ))}
      </div>
    </div>
  );
}
