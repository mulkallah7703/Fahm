import { describe, expect, it } from "vitest";
import { isDyslexiaAction } from "../config/dyslexia.js";
import {
  applyPrefs,
  attachDyslexiaState,
  buildReadingSegments,
  findConceptByWord,
  latinTerm,
  publicDyslexia,
  readingSentences,
  shouldUseDyslexiaExperience,
} from "../services/teaching/dyslexiaReadingService.js";
import type { AnalysisDto } from "../types/analysis.js";
import type { LessonState, TeachingContent } from "../types/teaching.js";

function analysis(text: string): AnalysisDto {
  return {
    material: { id: "m1", title: "صفحة علوم", type: "text", mimeType: null, hasFile: false },
    page: { id: "p1", pageNumber: 1, pageCount: 1 },
    session: { id: "s1", modeCode: "dyslexia", modeName: "Dyslexia" },
    status: "completed",
    stages: [],
    processingTimeMs: 1,
    wordCount: 8,
    ocr: {
      text,
      originalText: text,
      isCorrected: false,
      language: "ar",
      confidence: 90,
      processingTimeMs: 1,
      engine: "test",
      lowConfidence: false,
    },
    vision: null,
    structure: { title: "صفحة علوم", sections: [] },
    concepts: [],
    relationships: [],
    gradeEstimate: null,
    error: null,
  };
}

function content(): TeachingContent {
  return {
    title: "صفحة علوم",
    mainIdea: "دورة الماء هي حركة الماء المستمرة.",
    keyPoints: [{ text: "الحرارة تسبب تبخر الماء.", source: "من النص" }],
    terms: [{ conceptId: "c1", name: "التبخر", definition: "تحول الماء إلى بخار." }],
    visualDescription: null,
    example: null,
    simplifiedExplanation: null,
    speechText: "",
  };
}

describe("dyslexia reading segments", () => {
  it("builds semantic segments from real teaching and OCR text only", () => {
    const segments = buildReadingSegments(analysis("دورة الماء هي حركة الماء المستمرة."), content());
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.some((item) => item.text.includes("دورة الماء"))).toBe(true);
    expect(segments.some((item) => item.text.includes("التبخر"))).toBe(true);
    expect(segments.every((item) => item.text.length > 0)).toBe(true);
  });

  it("returns no invented educational facts when OCR is empty", () => {
    const empty = analysis("");
    empty.ocr = null;
    const segments = buildReadingSegments(empty, {
      ...content(),
      title: "",
      mainIdea: "",
      keyPoints: [],
      terms: [],
    });
    expect(segments).toEqual([]);
  });

  it("does not invent an English term when none exists", () => {
    expect(latinTerm("تحول الماء إلى بخار.")).toBeNull();
    expect(latinTerm("evaporation عملية")).toBe("evaporation");
  });

  it("matches known concepts only", () => {
    expect(findConceptByWord(content().terms, "التبخر")?.conceptId).toBe("c1");
    expect(findConceptByWord(content().terms, "الهطول")).toBeNull();
  });

  it("uses Dyslexia presentation only for the dyslexia accessibility mode", () => {
    expect(shouldUseDyslexiaExperience("dyslexia")).toBe(true);
    expect(shouldUseDyslexiaExperience("blind")).toBe(false);
    expect(shouldUseDyslexiaExperience("adaptive")).toBe(false);
  });

  it("splits real sentences without inventing lines", () => {
    expect(readingSentences("الجملة الأولى. الجملة الثانية.")).toEqual([
      "الجملة الأولى.",
      "الجملة الثانية.",
    ]);
  });

  it("rejects unknown actions", () => {
    expect(isDyslexiaAction("next_segment")).toBe(true);
    expect(isDyslexiaAction("focus_segment")).toBe(true);
    expect(isDyslexiaAction("diagnose")).toBe(false);
  });

  it("restores the previous reading position when content is unchanged", () => {
    const page = analysis("دورة الماء هي حركة الماء المستمرة.");
    const first = emptyLesson();
    attachDyslexiaState(first, page);
    first.dyslexia!.currentSegmentIndex = 2;
    const again = { ...first, dyslexia: first.dyslexia };
    attachDyslexiaState(again, page);
    expect(again.dyslexia?.currentSegmentIndex).toBe(2);
    expect(again.dyslexia?.contentHash).toBe(first.dyslexia?.contentHash);
  });

  it("labels progress from semantic segments, not screen lines", () => {
    const state = emptyLesson();
    attachDyslexiaState(state, analysis("دورة الماء هي حركة الماء المستمرة."));
    state.dyslexia!.currentSegmentIndex = 1;
    const dto = publicDyslexia(state, 1);
    expect(dto?.progress.total).toBeGreaterThan(1);
    expect(dto?.progress.current).toBe(2);
    expect(dto?.progress.label).toMatch(/من/);
    expect(dto?.emptyMessage).toBeNull();
  });

  it("shows an honest empty state when there is no readable text", () => {
    const empty = analysis("");
    empty.ocr = null;
    const state = emptyLesson();
    state.content = {
      ...content(),
      title: "",
      mainIdea: "",
      keyPoints: [],
      terms: [],
    };
    attachDyslexiaState(state, empty);
    expect(publicDyslexia(state, null)?.emptyMessage).toBe("لا يوجد نص مقروء من هذه الصفحة.");
  });

  it("applies reading preferences without inventing a medical setting", () => {
    const state = emptyLesson();
    attachDyslexiaState(state, analysis("الجملة الأولى."));
    applyPrefs(state.dyslexia!, { fontSize: "large", lineSpacing: 2.6, highlightCurrent: false });
    expect(state.dyslexia?.fontSize).toBe("large");
    expect(state.dyslexia?.lineSpacing).toBe(2.6);
    expect(state.dyslexia?.highlightCurrent).toBe(false);
  });
});

function emptyLesson(): LessonState {
  return {
    version: 1,
    currentStepIndex: 0,
    difficulty: "medium",
    strategy: {
      mode: "dyslexia",
      variant: "standard",
      explanationStyle: "simple",
      explanationLength: "medium",
      chunkSize: 2,
      questionFrequency: "medium",
      interactionType: "reading",
      difficulty: "medium",
      visualSupport: true,
      audioSupport: true,
    },
    adaptiveEnabled: false,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    hintsUsed: 0,
    explanationRequests: 0,
    examplesRequested: 0,
    lastHintQuestionId: null,
    completed: false,
    content: content(),
    steps: [],
  };
}
