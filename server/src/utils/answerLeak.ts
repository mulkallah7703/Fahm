const SECRET_KEYS = [
  "correctanswer",
  "correct",
  "expectedanswer",
  "secret",
  "scoring",
  "scoringrule",
];

export function hasAnswerLeak(value: unknown, path = ""): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = hasAnswerLeak(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.replace(/[_-]/g, "").toLowerCase();
    if (SECRET_KEYS.includes(normalized)) return path ? `${path}.${key}` : key;
    const found = hasAnswerLeak(nested, path ? `${path}.${key}` : key);
    if (found) return found;
  }
  return null;
}
