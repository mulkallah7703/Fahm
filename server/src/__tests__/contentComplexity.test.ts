import { describe, expect, it } from "vitest";
import { scoreContentComplexity } from "../services/learning/contentComplexityService.js";

describe("scoreContentComplexity", () => {
  it("returns unknown when analysis is empty", () => {
    const result = scoreContentComplexity({
      conceptCount: 0,
      relationshipCount: 0,
      wordCount: 0,
      sectionCount: 0,
      hasDiagram: false,
      hasTable: false,
      analysisReady: false,
    });
    expect(result.level).toBe("unknown");
    expect(result.score).toBe(0);
  });

  it("scores a simple page as low", () => {
    const result = scoreContentComplexity({
      conceptCount: 2,
      relationshipCount: 1,
      wordCount: 40,
      sectionCount: 1,
      hasDiagram: false,
      hasTable: false,
      analysisReady: true,
    });
    expect(result.level).toBe("low");
    expect(result.score).toBeGreaterThan(0);
  });

  it("scores dense visual content as high", () => {
    const result = scoreContentComplexity({
      conceptCount: 8,
      relationshipCount: 7,
      wordCount: 420,
      sectionCount: 6,
      hasDiagram: true,
      hasTable: true,
      analysisReady: true,
    });
    expect(result.level).toBe("high");
    expect(result.score).toBeGreaterThan(0.64);
  });

  it("does not invent diagrams", () => {
    const result = scoreContentComplexity({
      conceptCount: 3,
      relationshipCount: 2,
      wordCount: 80,
      sectionCount: 2,
      hasDiagram: false,
      hasTable: false,
      analysisReady: true,
    });
    expect(result.signals.hasDiagram).toBe(false);
    expect(result.signals.hasTable).toBe(false);
  });
});
