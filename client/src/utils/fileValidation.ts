export const MAX_UPLOAD_SIZE_MB = 15;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const MAX_TEXT_LENGTH = 50_000;

const ALLOWED = ["image/png", "image/jpeg", "application/pdf"] as const;

export function validateClientFile(file: File): string | null {
  if (file.size <= 0) return "الملف فارغ.";
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `حجم الملف أكبر من الحد المسموح (${MAX_UPLOAD_SIZE_MB} ميغابايت).`;
  }
  const type = file.type.toLowerCase();
  if (type === "image/jpg") return null;
  if (type && !ALLOWED.includes(type as (typeof ALLOWED)[number])) {
    return "نوع الملف غير مدعوم.";
  }
  return null;
}

export function fileFromDataUrl(dataUrl: string, name = "camera.jpg"): File {
  const [meta, content] = dataUrl.split(",");
  const mime = /data:(.*);base64/.exec(meta ?? "")?.[1] ?? "image/jpeg";
  const binary = atob(content ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], name, { type: mime });
}
