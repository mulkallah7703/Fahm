import { env } from "./env.js";

export const MAX_UPLOAD_SIZE_MB = env.limits.maxUploadSizeMb;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const MAX_TEXT_LENGTH = env.limits.maxTextLength;
export const DASHBOARD_REVIEW_CONCEPT_LIMIT = 3;
export const DASHBOARD_RECENT_LESSON_LIMIT = 5;
export const HISTORY_DEFAULT_LIMIT = 20;
export const HISTORY_MAX_LIMIT = 50;
export const LEARNING_RECENT_ANSWER_LIMIT = 30;
export const LEARNING_RECENT_SESSION_LIMIT = 10;
export const BCRYPT_ROUNDS = 12;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
] as const;

export type AllowedUploadMime = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

export const MIME_EXTENSION: Record<AllowedUploadMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/pdf": "pdf",
};
