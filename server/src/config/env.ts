import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env") });
dotenv.config({ path: path.resolve(here, "../../.env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function number(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw === "true" || raw === "1";
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProduction: optional("NODE_ENV", "development") === "production",
  port: number("PORT", 4000),
  clientUrl: optional("CLIENT_URL", "http://localhost:5173"),
  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: optional("JWT_EXPIRES_IN", "7d"),
  },
  db: {
    auth: (optional("DB_AUTH", "windows") === "sql" ? "sql" : "windows") as
      | "sql"
      | "windows",
    server: optional("DB_SERVER", "localhost"),
    instance: optional("DB_INSTANCE", "SQLEXPRESS"),
    database: optional("DB_DATABASE", "Fahm"),
    port: number("DB_PORT", 1433),
    user: optional("DB_USER"),
    password: optional("DB_PASSWORD"),
    encrypt: bool("DB_ENCRYPT", true),
    trustServerCertificate: bool("DB_TRUST_SERVER_CERTIFICATE", true),
    poolMin: number("DB_POOL_MIN", 2),
    poolMax: number("DB_POOL_MAX", 10),
    odbcDriver: optional("DB_ODBC_DRIVER", "ODBC Driver 18 for SQL Server"),
  },
  storage: {
    provider: optional("STORAGE_PROVIDER", "local"),
    root: optional("STORAGE_ROOT", "./storage/uploads"),
    publicBase: optional("STORAGE_PUBLIC_BASE", "/api/materials"),
  },
  limits: {
    maxUploadSizeMb: number("MAX_UPLOAD_SIZE_MB", 15),
    maxTextLength: number("MAX_TEXT_LENGTH", 50_000),
  },
  cookie: {
    name: optional("COOKIE_NAME", "fahm_token"),
    secure: bool("COOKIE_SECURE", false),
  },
  openai: {
    apiKey: optional("OPENAI_API_KEY"),
    visionModel: optional("OPENAI_VISION_MODEL", "gpt-4o-mini"),
    textModel: optional("OPENAI_TEXT_MODEL", "gpt-4o-mini"),
  },
  gemini: {
    apiKey: optional("GEMINI_API_KEY"),
    analysisModel: optional("GEMINI_ANALYSIS_MODEL", "gemini-2.0-flash"),
    teachingModel: optional("GEMINI_TEACHING_MODEL", "gemini-2.0-flash"),
  },
  elevenLabs: {
    apiKey: optional("ELEVENLABS_API_KEY"),
    voiceId: optional("ELEVENLABS_VOICE_ID"),
    voiceMaleId: optional("ELEVENLABS_VOICE_MALE_ID"),
    modelId: optional("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2"),
  },
} as const;
