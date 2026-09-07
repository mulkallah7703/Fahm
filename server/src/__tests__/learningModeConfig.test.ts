import { describe, expect, it } from "vitest";
import { LEARNING_MODE_CONFIGS } from "../config/learningModes.js";
import { selectModeSchema } from "../validators/learningValidators.js";

describe("LearningModeConfig", () => {
  it("keeps teaching configuration on the server", () => {
    expect(LEARNING_MODE_CONFIGS.focus.maxKeyPoints).toBe(3);
    expect(LEARNING_MODE_CONFIGS.focus.questionCountPerStep).toBe(1);
    expect(LEARNING_MODE_CONFIGS.blind.describeVisuals).toBe(true);
    expect(LEARNING_MODE_CONFIGS.blind.audioEnabled).toBe(true);
    expect(LEARNING_MODE_CONFIGS.dyslexia.simplifyLanguage).toBe(true);
    expect(LEARNING_MODE_CONFIGS.dyslexia.preserveFacts).toBe(true);
    expect(LEARNING_MODE_CONFIGS.adaptive.explanationStyle).toBe("adaptive");
  });

  it("rejects arbitrary mode codes", () => {
    expect(selectModeSchema.safeParse({ modeCode: "hack", adaptiveEnabled: true }).success).toBe(
      false,
    );
    expect(selectModeSchema.safeParse({ modeCode: "focus", adaptiveEnabled: true }).success).toBe(
      true,
    );
  });
});
