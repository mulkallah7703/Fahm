import { z } from "zod";

export const tableSchema = z.object({
  title: z.string().optional(),
  headers: z.array(z.string()).default([]),
  rows: z.array(z.array(z.string())).default([]),
});

export const visualElementSchema = z.object({
  type: z.string(),
  description: z.string(),
  location: z.string().optional(),
});

export const sectionSchema = z.object({
  type: z.enum(["heading", "paragraph", "diagram", "table", "image", "other"]),
  text: z.string().optional(),
  description: z.string().optional(),
  table: tableSchema.optional(),
});

export const visionPayloadSchema = z.object({
  pageType: z.string().optional(),
  title: z.string().nullable().optional(),
  summary: z.string().default(""),
  visualDescription: z.string().nullable().optional(),
  visualElements: z.array(visualElementSchema).default([]),
  tables: z.array(tableSchema).default([]),
  charts: z.array(z.unknown()).default([]),
  equations: z.array(z.unknown()).default([]),
  importantVisualRelationships: z.array(z.string()).default([]),
  sections: z.array(sectionSchema).default([]),
  gradeLevel: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  gradeConfidence: z.number().min(0).max(1).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type VisionPayload = z.infer<typeof visionPayloadSchema>;

export const conceptPayloadSchema = z.object({
  concepts: z
    .array(
      z.object({
        name: z.string().min(1).max(300),
        description: z.string().nullable().optional(),
        subject: z.string().nullable().optional(),
        importanceScore: z.number().min(0).max(1).default(0.5),
        confidenceScore: z.number().min(0).max(1).default(0.5),
      }),
    )
    .max(12)
    .default([]),
  relationships: z
    .array(
      z.object({
        source: z.string(),
        target: z.string(),
        type: z.string(),
        confidenceScore: z.number().min(0).max(1).optional(),
      }),
    )
    .max(20)
    .default([]),
  title: z.string().nullable().optional(),
  gradeLevel: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  gradeConfidence: z.number().min(0).max(1).nullable().optional(),
});

export type ConceptPayload = z.infer<typeof conceptPayloadSchema>;
