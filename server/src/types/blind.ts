import type { BlindAction, BlindSegmentType, BlindSpeed } from "../config/blind.js";

export interface BlindSegment {
  id: string;
  type: BlindSegmentType;
  order: number;
  title: string;
  text: string;
  detailedText: string | null;
  available: boolean;
  unavailableReason: string | null;
  sourceConceptIds: string[];
  paragraphIndex: number | null;
}

export interface BlindLessonState {
  contentHash: string;
  currentSegmentIndex: number;
  replayCount: number;
  speechRate: BlindSpeed;
  lastAction: BlindAction | null;
  lastActionMessage: string | null;
  detailOpen: boolean;
  listenedIds: string[];
  segments: BlindSegment[];
}

export interface BlindSegmentDto {
  id: string;
  type: BlindSegmentType;
  order: number;
  title: string;
  text: string;
  detailedAvailable: boolean;
  available: boolean;
  unavailableReason: string | null;
  paragraphIndex: number | null;
}

export interface BlindExperienceDto {
  currentSegmentIndex: number;
  currentSegment: BlindSegmentDto | null;
  segments: BlindSegmentDto[];
  progress: { current: number; total: number; label: string };
  speechRate: number;
  preferredVoice: string | null;
  fontSize: number | null;
  hasDiagram: boolean;
  hasTable: boolean;
  paragraphCount: number;
  ttsConfigured: boolean;
  recommendedSpeed: number | null;
  lastActionMessage: string | null;
  detailOpen: boolean;
}

export interface TtsResult {
  provider: "elevenlabs" | "browser";
  fallback: boolean;
  text: string;
  audioId: string | null;
  durationSeconds: number | null;
  reason: string | null;
}
