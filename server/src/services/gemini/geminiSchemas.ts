import { z } from "zod";

export const materialUnderstandingSchema = z.object({
  pageTitle: z.string().max(160),
  mainIdea: z.string().max(400),
  sections: z
    .array(
      z.object({
        heading: z.string().max(160),
        content: z.string().max(800),
      }),
    )
    .max(8),
  concepts: z
    .array(
      z.object({
        name: z.string().min(2).max(80),
        definition: z.string().max(400),
        evidence: z.string().max(400),
        importance: z.enum(["core", "supporting"]),
      }),
    )
    .max(8),
  relationships: z
    .array(
      z.object({
        from: z.string().max(80),
        relationship: z.enum(["causes", "leads_to", "part_of", "contrasts_with", "sequence"]),
        to: z.string().max(80),
        evidence: z.string().max(400),
      }),
    )
    .max(8),
  examples: z
    .array(
      z.object({
        text: z.string().max(400),
        evidence: z.string().max(400),
        pedagogical: z.boolean().optional(),
      }),
    )
    .max(4),
  visuals: z
    .array(
      z.object({
        type: z.enum(["diagram", "chart", "table", "illustration", "none"]),
        description: z.string().max(400),
        evidence: z.string().max(400),
      }),
    )
    .max(4),
  cleanText: z.string().max(4000),
  sourceQuality: z.enum(["high", "medium", "low"]),
  needsReanalysis: z.boolean().optional(),
});

export const geminiTeachingSchema = z.object({
  title: z.string().max(160),
  concept: z.string().min(2).max(80),
  coreIdea: z.string().min(8).max(400),
  explanation: z.string().min(8).max(900),
  steps: z.array(z.string().min(3).max(220)).max(5),
  example: z.string().max(400).nullable(),
  whyItMatters: z.string().max(300).nullable(),
  relationship: z.string().max(300).nullable(),
  importantTerms: z
    .array(
      z.object({
        term: z.string().min(2).max(80),
        meaning: z.string().min(3).max(240),
      }),
    )
    .max(6),
  quickCheck: z.object({
    question: z.string().min(5).max(240),
    type: z.enum(["multiple_choice", "true_false", "short_answer"]),
    options: z.array(z.string().min(1).max(160)).max(4),
  }),
  sourceEvidence: z
    .array(
      z.object({
        sourceType: z.enum(["page", "concept", "vision", "relationship"]),
        pageNumber: z.number().nullable(),
        evidence: z.string().max(240),
      }),
    )
    .min(1)
    .max(6),
  quality: z.object({
    grounded: z.boolean(),
    confidence: z.number().min(0).max(1),
    unsupportedClaims: z.number().min(0).max(20),
  }),
});

export type MaterialUnderstanding = z.infer<typeof materialUnderstandingSchema>;
export type GeminiTeachingOutput = z.infer<typeof geminiTeachingSchema>;
