import type { AnalysisStage, AnalysisStatus, StageState } from "../config/analysis.js";

export interface VisualElementDto {
  type: string;
  description: string;
  location?: string;
}

export interface TableDto {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface StructureSectionDto {
  type: "heading" | "paragraph" | "diagram" | "table" | "image" | "other";
  text?: string;
  description?: string;
  table?: TableDto;
}

export interface AnalysisConceptDto {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  importanceScore: number;
  confidenceScore: number;
}

export interface AnalysisRelationshipDto {
  source: string;
  target: string;
  type: string;
  confidenceScore: number | null;
}

export interface GradeEstimateDto {
  gradeLevel: string | null;
  subject: string | null;
  confidence: number;
  note: string | null;
}

export interface AnalysisDto {
  material: {
    id: string;
    title: string;
    type: string;
    mimeType: string | null;
    hasFile: boolean;
  };
  page: {
    id: string;
    pageNumber: number;
    pageCount: number | null;
  };
  session: {
    id: string;
    modeCode: string | null;
    modeName: string | null;
  };
  status: AnalysisStatus;
  stages: AnalysisStage[];
  processingTimeMs: number | null;
  wordCount: number;
  ocr: {
    text: string;
    originalText: string;
    isCorrected: boolean;
    language: string | null;
    confidence: number | null;
    processingTimeMs: number | null;
    engine: string | null;
    lowConfidence: boolean;
  } | null;
  vision: {
    summary: string;
    visualDescription: string | null;
    elements: VisualElementDto[];
    tables: TableDto[];
    modelName: string | null;
    processingTimeMs: number | null;
  } | null;
  structure: {
    title: string | null;
    sections: StructureSectionDto[];
  };
  concepts: AnalysisConceptDto[];
  relationships: AnalysisRelationshipDto[];
  gradeEstimate: GradeEstimateDto | null;
  error: { code: string; message: string; stage: string | null } | null;
}

export type { AnalysisStage, AnalysisStatus, StageState };
