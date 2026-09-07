import type { KeyboardEvent } from "react";
import type { CatalogMode, ModeRecommendation } from "../../types";
import { Button } from "../common/Button";
import { ModeReason } from "./ModeReason";

interface Props {
  mode: CatalogMode;
  selected: boolean;
  recommendation: ModeRecommendation | null;
  isNewLearner: boolean;
  onSelect: () => void;
}

export function AdaptiveRecommendationCard({
  mode,
  selected,
  recommendation,
  isNewLearner,
  onSelect,
}: Props) {
  const recommendedHere = mode.recommended;
  const showWhy = recommendedHere && recommendation;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      className={`adaptive-card ${selected ? "selected" : ""}`}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <div className="mode-card-head">
        <div>
          <h2>{mode.name}</h2>
          <p className="mode-en">{mode.englishName}</p>
        </div>
        {recommendedHere ? (
          <span className="mode-badge">موصى به لك</span>
        ) : (
          <span className="mode-badge ghost">يمكنك تجربته</span>
        )}
        {selected ? (
          <span className="selected-flag" aria-hidden="true">
            محدد
          </span>
        ) : null}
      </div>
      <p className="mode-copy">{mode.description}</p>
      <p className="mode-compare">{mode.comparison}</p>
      {isNewLearner && recommendedHere ? (
        <ModeReason
          title="ما زلنا نتعرف على طريقة تعلمك"
          text="سنتعلم من تفاعلك أثناء الدرس. فَهْم يتعلم من تفاعلك ليحسن طريقة الشرح."
        />
      ) : null}
      {showWhy && !isNewLearner ? (
        <ModeReason title="لماذا أوصي بهذا الوضع؟" text={recommendation.reasonText} />
      ) : null}
      <Button
        type="button"
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        اختر هذا الوضع
      </Button>
    </div>
  );
}
