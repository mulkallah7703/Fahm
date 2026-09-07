import type { LearningModeCode } from "../../config/learningModes.js";
import type { DifficultyLevel, QuestionKind } from "../../config/teaching.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type { PublicQuestion, QuestionSecret } from "../../types/teaching.js";

export interface BuiltQuestion {
  type: QuestionKind;
  text: string;
  options: string[] | null;
  secret: QuestionSecret;
  conceptId: string | null;
  difficulty: DifficultyLevel;
}

export function buildGroundedQuestion(
  analysis: AnalysisDto,
  difficulty: DifficultyLevel,
  mode: LearningModeCode = "adaptive",
): BuiltQuestion | null {
  const concepts = [...analysis.concepts].sort((a, b) => b.importanceScore - a.importanceScore);
  if (mode === "focus" && concepts[0]) {
    return {
      type: "true_false",
      text: `هل الفكرة الأساسية هنا هي «${concepts[0].name}»؟`,
      options: ["نعم", "لا"],
      secret: { correct: "نعم", options: ["نعم", "لا"], aliases: ["صح", "true", "yes"] },
      conceptId: concepts[0].id,
      difficulty,
    };
  }
  if (mode === "blind" && concepts[0]) {
    return {
      type: "true_false",
      text: `هل تتحدث هذه الصفحة عن «${concepts[0].name}»؟ أجب بنعم أو لا.`,
      options: ["نعم", "لا"],
      secret: { correct: "نعم", options: ["نعم", "لا"], aliases: ["صح", "true", "yes"] },
      conceptId: concepts[0].id,
      difficulty,
    };
  }
  if (mode === "dyslexia" && concepts[0]) {
    return {
      type: "true_false",
      text: `هل الصفحة تتكلم عن «${concepts[0].name}»؟`,
      options: ["نعم", "لا"],
      secret: { correct: "نعم", options: ["نعم", "لا"], aliases: ["صح", "true", "yes"] },
      conceptId: concepts[0].id,
      difficulty,
    };
  }
  if (concepts.length >= 2) {
    const correct = concepts[0];
    const options = concepts.slice(0, Math.min(4, concepts.length)).map((item) => item.name);
    return {
      type: "multiple_choice",
      text:
        difficulty === "hard"
          ? "أي مفهوم يعبّر عن الفكرة الأكثر أهمية في هذه الصفحة؟"
          : "أي من الآتي مفهوم أساسي في هذه الصفحة؟",
      options,
      secret: { correct: correct.name, options },
      conceptId: correct.id,
      difficulty,
    };
  }

  if (concepts.length === 1) {
    const concept = concepts[0];
    return {
      type: "true_false",
      text: `هل تتحدث هذه الصفحة عن «${concept.name}»؟`,
      options: ["نعم", "لا"],
      secret: { correct: "نعم", options: ["نعم", "لا"], aliases: ["صح", "true", "yes"] },
      conceptId: concept.id,
      difficulty,
    };
  }

  const sentence = (analysis.ocr?.text ?? "").trim();
  if (!sentence) return null;
  const snippet = sentence.slice(0, 48);
  return {
    type: "short_answer",
    text: "اكتب الفكرة الأساسية كما وردت في الصفحة بكلماتك.",
    options: null,
    secret: { correct: snippet, aliases: snippet.split(/\s+/).slice(0, 4) },
    conceptId: null,
    difficulty,
  };
}

export function buildConceptQuestion(
  analysis: AnalysisDto,
  concept: AnalysisDto["concepts"][number],
  siblings: AnalysisDto["concepts"],
  difficulty: DifficultyLevel,
): BuiltQuestion {
  const pageNames = new Set(analysis.concepts.map((item) => item.name));
  const names = unique([concept.name, ...siblings.map((item) => item.name)].filter((name) => pageNames.has(name))).slice(0, 4);
  const descriptions = unique(
    [concept.description, ...siblings.map((item) => item.description)].filter((item): item is string => Boolean(item?.trim())),
  ).slice(0, 4);

  if (difficulty === "hard" && concept.description?.trim() && names.length >= 2) {
    return {
      type: "multiple_choice",
      text: `حسب الصفحة، ما العملية التي تعني: «${clip(concept.description, 80)}»؟`,
      options: names,
      secret: { correct: concept.name, options: names },
      conceptId: concept.id,
      difficulty,
    };
  }

  if (descriptions.length >= 2 && concept.description?.trim()) {
    return {
      type: "multiple_choice",
      text: `أي وصف يناسب «${concept.name}» كما ورد في هذه الصفحة؟`,
      options: descriptions,
      secret: { correct: concept.description.trim(), options: descriptions },
      conceptId: concept.id,
      difficulty,
    };
  }

  if (names.length >= 2) {
    return {
      type: "multiple_choice",
      text:
        difficulty === "hard"
          ? `أي مفهوم من هذه الصفحة يرتبط بهذه الفكرة: «${concept.name}»؟`
          : `أي من الآتي مفهوم أساسي في هذه الصفحة؟`,
      options: names,
      secret: { correct: concept.name, options: names },
      conceptId: concept.id,
      difficulty,
    };
  }

  return {
    type: "true_false",
    text: `هل تتحدث هذه الصفحة عن «${concept.name}»؟`,
    options: ["نعم", "لا"],
    secret: { correct: "نعم", options: ["نعم", "لا"], aliases: ["صح", "true", "yes"] },
    conceptId: concept.id,
    difficulty,
  };
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    next.push(clean);
  }
  return next;
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}

export function toPublicQuestion(id: string, built: BuiltQuestion): PublicQuestion {
  return {
    id,
    type: built.type,
    text: built.text,
    options: built.options,
    difficulty: built.difficulty,
  };
}

export function buildFollowUpQuestion(
  analysis: AnalysisDto,
  previousConceptId: string | null,
  _difficulty: DifficultyLevel,
): BuiltQuestion | null {
  const concepts = [...analysis.concepts].sort((a, b) => b.importanceScore - a.importanceScore);
  const next = concepts.find((item) => item.id !== previousConceptId) ?? concepts[0];
  if (!next) return buildGroundedQuestion(analysis, "easy");
  return {
    type: "true_false",
    text: `هل يظهر مفهوم «${next.name}» في هذه الصفحة؟`,
    options: ["نعم", "لا"],
    secret: { correct: "نعم", options: ["نعم", "لا"], aliases: ["صح", "true", "yes"] },
    conceptId: next.id,
    difficulty: "easy",
  };
}

export function parseSecret(raw: string | null): QuestionSecret | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QuestionSecret;
    if (!parsed.correct || typeof parsed.correct !== "string") return null;
    return parsed;
  } catch {
    return { correct: raw };
  }
}
