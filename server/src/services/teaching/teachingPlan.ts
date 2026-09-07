import type { LearningModeCode } from "../../config/learningModes.js";
import type { TeachingVariant } from "../../config/teaching.js";
import type { AnalysisDto } from "../../types/analysis.js";
import { buildLessonModel, type GroundedConceptLesson, type GroundedLessonModel } from "./lessonModel.js";

export interface TeachingPlanStep {
  id: string;
  title: string;
  kind: "orientation" | "concept" | "example" | "vocabulary" | "visual" | "audio" | "check";
  conceptId: string | null;
}

export interface TeachingPlan {
  mode: LearningModeCode;
  variant: TeachingVariant;
  label: string;
  objective: string;
  sequence: TeachingPlanStep[];
  questionStyle: "short_direct" | "verbal" | "low_load" | "mastery_scaled";
  controls: string[];
  teachOneConceptAtATime: boolean;
  audioFirst: boolean;
  readingFirst: boolean;
  observesEvidence: boolean;
  visualPolicy: "never" | "if_present";
  sourceEvidence: string[];
  concepts: GroundedConceptLesson[];
  missing: string[];
  fingerprint: string;
}

const MODE_LABEL: Record<LearningModeCode, string> = {
  focus: "تركيز على الفكرة",
  blind: "تعلم بالصوت",
  dyslexia: "قراءة ميسّرة",
  adaptive: "يتكيف مع فهمك",
};

const MODE_OBJECTIVE: Record<LearningModeCode, string> = {
  focus: "نفهم أهم فكرة واحدة في كل مرة، ثم نتحقق سريعًا قبل الانتقال.",
  blind: "نشرح الصفحة بالصوت: العنوان، الفكرة، المفاهيم، ثم أي رسم أو جدول إن وُجد.",
  dyslexia: "نقرأ الصفحة جملة جملة، مع دعم الكلمات الصعبة دون تغيير المعنى العلمي.",
  adaptive: "نبدأ بشرح مباشر، ثم نغيّر الأسلوب فقط عندما يظهر دليل من إجاباتك وطلباتك.",
};

const MODE_CONTROLS: Record<LearningModeCode, string[]> = {
  focus: ["teach", "check", "continue", "hint", "simplify"],
  blind: ["play", "pause", "replay", "next", "previous", "orientation", "visual", "test_me"],
  dyslexia: ["read", "focus_sentence", "explain_word", "simplify", "vocabulary", "replay", "test_me"],
  adaptive: ["understood", "not_understood", "try_another", "continue", "test_me"],
};

export function buildTeachingPlan(input: {
  analysis: AnalysisDto;
  mode: LearningModeCode;
  variant: TeachingVariant;
  model?: GroundedLessonModel;
}): TeachingPlan {
  const model = input.model ?? buildLessonModel(input.analysis);
  const concepts = conceptsForMode(model.concepts, input.mode);
  return {
    mode: input.mode,
    variant: input.variant,
    label: MODE_LABEL[input.mode],
    objective: MODE_OBJECTIVE[input.mode],
    sequence: sequenceFor(input.mode, concepts, model),
    questionStyle: questionStyleFor(input.mode),
    controls: MODE_CONTROLS[input.mode],
    teachOneConceptAtATime: input.mode === "focus",
    audioFirst: input.mode === "blind",
    readingFirst: input.mode === "dyslexia",
    observesEvidence: input.mode === "adaptive",
    visualPolicy: input.mode === "focus" || input.mode === "dyslexia" ? "never" : "if_present",
    sourceEvidence: model.sourceEvidence,
    concepts,
    missing: model.missing,
    fingerprint: `${input.mode}:${input.variant}:${concepts.map((item) => item.conceptId).join(",")}:${model.hasDiagram ? "d" : ""}:${model.hasTable ? "t" : ""}`,
  };
}

export function plansDiffer(left: TeachingPlan, right: TeachingPlan): boolean {
  return (
    left.mode !== right.mode ||
    left.fingerprint !== right.fingerprint ||
    left.sequence.map((item) => item.kind).join(">") !== right.sequence.map((item) => item.kind).join(">") ||
    left.questionStyle !== right.questionStyle ||
    left.controls.join(",") !== right.controls.join(",")
  );
}

function conceptsForMode(concepts: GroundedConceptLesson[], mode: LearningModeCode): GroundedConceptLesson[] {
  if (mode === "focus") return concepts.slice(0, 3);
  if (mode === "dyslexia") return concepts.slice(0, 4);
  return concepts.slice(0, 6);
}

function questionStyleFor(mode: LearningModeCode): TeachingPlan["questionStyle"] {
  if (mode === "focus") return "short_direct";
  if (mode === "blind") return "verbal";
  if (mode === "dyslexia") return "low_load";
  return "mastery_scaled";
}

function sequenceFor(
  mode: LearningModeCode,
  concepts: GroundedConceptLesson[],
  model: GroundedLessonModel,
): TeachingPlanStep[] {
  if (mode === "focus") {
    const steps: TeachingPlanStep[] = [];
    for (const concept of concepts.slice(0, 3)) {
      steps.push({
        id: `concept:${concept.conceptId}`,
        title: `ما هو ${concept.name}؟`,
        kind: "concept",
        conceptId: concept.conceptId,
      });
      if (concept.example) {
        steps.push({
          id: `example:${concept.conceptId}`,
          title: "مثال من الصفحة",
          kind: "example",
          conceptId: concept.conceptId,
        });
      }
    }
    steps.push({ id: "check", title: "تحقق سريع", kind: "check", conceptId: concepts[0]?.conceptId ?? null });
    return steps;
  }

  if (mode === "blind") {
    const steps: TeachingPlanStep[] = [
      { id: "orient", title: "أين نحن؟", kind: "orientation", conceptId: null },
      { id: "audio-idea", title: "الفكرة الرئيسية", kind: "audio", conceptId: concepts[0]?.conceptId ?? null },
    ];
    if (model.hasDiagram || model.hasTable) {
      steps.push({ id: "visual", title: "وصف ما لا يُرى", kind: "visual", conceptId: null });
    }
    steps.push({ id: "terms", title: "المفاهيم المهمة", kind: "vocabulary", conceptId: null });
    steps.push({ id: "check", title: "اختبرني", kind: "check", conceptId: concepts[0]?.conceptId ?? null });
    return steps;
  }

  if (mode === "dyslexia") {
    return [
      { id: "read", title: "اقرأ الجملة", kind: "concept", conceptId: concepts[0]?.conceptId ?? null },
      { id: "vocab", title: "الكلمات المهمة", kind: "vocabulary", conceptId: null },
      { id: "check", title: "اختبرني", kind: "check", conceptId: concepts[0]?.conceptId ?? null },
    ];
  }

  const adaptive: TeachingPlanStep[] = [
    { id: "idea", title: "شرح مباشر", kind: "concept", conceptId: concepts[0]?.conceptId ?? null },
    { id: "points", title: "النقاط والعلاقات", kind: "example", conceptId: null },
    { id: "terms", title: "المفاهيم", kind: "vocabulary", conceptId: null },
  ];
  if (model.hasDiagram || model.hasTable) {
    adaptive.push({ id: "visual", title: "إن وُجد رسم أو جدول", kind: "visual", conceptId: null });
  }
  adaptive.push({ id: "check", title: "اختبر الفهم", kind: "check", conceptId: concepts[0]?.conceptId ?? null });
  return adaptive;
}
