import type { KeyboardEvent } from "react";
import type { CatalogMode } from "../../types";
import { Button } from "../common/Button";
import { ModeFeatureList } from "./ModeFeatureList";
import { ModeReason } from "./ModeReason";

interface Props {
  mode: CatalogMode;
  selected: boolean;
  reasonText?: string | null;
  onSelect: () => void;
}

export function ModeCard({ mode, selected, reasonText, onSelect }: Props) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      className={`mode-card ${selected ? "selected" : ""}`}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <div className="mode-card-head">
        <div>
          <h3>{mode.name}</h3>
          <p className="mode-en">{mode.englishName}</p>
        </div>
        {mode.recommended ? <span className="mode-badge">موصى به لك</span> : null}
        {selected ? (
          <span className="selected-flag" aria-hidden="true">
            محدد
          </span>
        ) : null}
      </div>
      <p className="mode-copy">{mode.description}</p>
      <p className="mode-compare">{mode.comparison}</p>
      {mode.recommended && reasonText ? (
        <ModeReason title="لماذا أوصي بهذا الوضع؟" text={reasonText} />
      ) : null}
      <ModeFeatureList features={mode.features} />
      <Button
        variant="ghost"
        type="button"
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        اختر
      </Button>
    </div>
  );
}
