import type { LearningModeCode } from "../../config/learningModes.js";
import type { TeachingVariant } from "../../config/teaching.js";
import type { MaterialUnderstanding } from "../gemini/geminiSchemas.js";
import type { StudentTeachingProfile } from "../gemini/studentTeachingProfile.js";

export interface TeachingStrategyBrief {
  mode: LearningModeCode;
  variant: TeachingVariant;
  label: string;
  objective: string;
  tutorVoice: string;
  maxParagraphs: number;
  allowInventedVisual: false;
  chunking: "one_idea" | "short_steps" | "spoken_sequence" | "evidence_based";
  audioFirst: boolean;
  readingFirst: boolean;
  usesEvidence: boolean;
}

export function buildTeachingStrategy(
  profile: StudentTeachingProfile,
  understanding: MaterialUnderstanding,
): TeachingStrategyBrief {
  const hasVisual = understanding.visuals.some((item) => item.type !== "none");
  if (profile.mode === "focus") {
    return {
      mode: "focus",
      variant: profile.variant,
      label: "تركيز على الفكرة",
      objective: "فهم سريع لفكرة واحدة ثم تحقق قصير.",
      tutorVoice:
        "علّم فكرة واحدة فقط. اكتب الفكرة الأساسية، ثم كيف تحدث في خطوات قصيرة، ثم مثالًا واحدًا إن وُجد في المصدر. لا تكرر النص.",
      maxParagraphs: 4,
      allowInventedVisual: false,
      chunking: "short_steps",
      audioFirst: false,
      readingFirst: false,
      usesEvidence: false,
    };
  }
  if (profile.mode === "blind") {
    return {
      mode: "blind",
      variant: profile.variant,
      label: "تعلم بالصوت",
      objective: "شرح متسلسل يُقرأ بصوت طبيعي دون الاعتماد على البصر.",
      tutorVoice: hasVisual
        ? "اكتب شرحًا يُسمع: لنبدأ بالفكرة الأساسية، الفكرة الأولى، ثم ننتقل. صف الرسم فقط لأنه موجود في المصدر."
        : "اكتب شرحًا يُسمع: لنبدأ بالفكرة الأساسية، الفكرة الأولى، ثم ننتقل. لا تخترع رسمًا.",
      maxParagraphs: 6,
      allowInventedVisual: false,
      chunking: "spoken_sequence",
      audioFirst: true,
      readingFirst: false,
      usesEvidence: false,
    };
  }
  if (profile.mode === "dyslexia") {
    return {
      mode: "dyslexia",
      variant: profile.variant,
      label: "قراءة ميسّرة",
      objective: "فكرة واحدة، جملة قصيرة، ثم شرح بسيط دون إطالة.",
      tutorVoice:
        "جمل قصيرة جدًا. فكرة واحدة في كل سطر. أبقِ المصطلح العلمي ثم اشرح معناه بجملة واحدة. لا تكتب فقرة طويلة.",
      maxParagraphs: 5,
      allowInventedVisual: false,
      chunking: "one_idea",
      audioFirst: false,
      readingFirst: true,
      usesEvidence: false,
    };
  }
  return {
    mode: "adaptive",
    variant: profile.variant,
    label: "يتكيف مع فهمك",
    objective: adaptiveObjective(profile.variant),
    tutorVoice: adaptiveVoice(profile),
    maxParagraphs: profile.variant === "simplified" ? 3 : 5,
    allowInventedVisual: false,
    chunking: "evidence_based",
    audioFirst: profile.variant === "verbal",
    readingFirst: false,
    usesEvidence: true,
  };
}

function adaptiveObjective(variant: TeachingVariant): string {
  if (variant === "simplified") return "شرح أبسط لنفس الفكرة لأن الطالب احتاج إعادة.";
  if (variant === "example") return "مثال أوضح من المادة ثم الفكرة.";
  if (variant === "verbal") return "شرح مسموع لأن الطالب يحتاج دعمًا صوتيًا.";
  return "شرح مباشر، ثم نغيّر الأسلوب فقط عند ظهور دليل حقيقي.";
}

function adaptiveVoice(profile: StudentTeachingProfile): string {
  if (profile.variant === "simplified" || profile.explanationRequests >= 2) {
    return "لاحظ فَهْم أن الشرح احتاج تبسيطًا. استخدم جملًا أقصر دون اختراع حقائق.";
  }
  if (profile.variant === "example" || profile.consecutiveIncorrect >= 2) {
    return "ابدأ بمثال مدعوم من المصدر ثم اربط الفكرة. لا تختلق مثالًا.";
  }
  if (profile.variant === "verbal") {
    return "اكتب كأنك تشرح بصوت هادئ ومتسلسل.";
  }
  return "شرح معياري واضح، ثم خطوات، ثم مثال إن وُجد في المصدر.";
}
