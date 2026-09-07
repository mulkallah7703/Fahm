const MODE_LABELS: Record<string, string> = {
  adaptive: "Smart adaptive",
  focus: "Focus",
  dyslexia: "Dyslexia",
  blind: "Blind",
};

export function modeLabel(code: string | null | undefined, fallback?: string | null): string {
  if (code && MODE_LABELS[code]) return MODE_LABELS[code];
  if (fallback) return fallback.replace(" Mode", "").replace("Mode", "").trim();
  return "Smart adaptive";
}

export function relativeTimeAr(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  if (days < 7) return `قبل ${days} أيام`;
  return then.toLocaleDateString("ar");
}

export function pulseStatusLabel(status: string): string {
  switch (status) {
    case "needs_significant_support":
      return "يحتاج دعمًا كبيرًا";
    case "needs_review":
      return "يحتاج مراجعة";
    case "good":
      return "جيد";
    case "strong":
      return "قوي";
    default:
      return "متوسط الفهم";
  }
}

export function conceptCountLabel(count: number): string {
  if (count === 0) return "بدون مفاهيم بعد";
  if (count === 1) return "مفهوم واحد";
  if (count === 2) return "مفهومان";
  if (count >= 3 && count <= 10) return `${count} مفاهيم`;
  return `${count} مفهومًا`;
}

export function reviewCountLabel(count: number): string {
  if (count === 0) return "لا توجد مفاهيم تحتاج مراجعة الآن.";
  if (count === 1) return "مفهوم واحد يحتاج مراجعة.";
  if (count === 2) return "مفهومان يحتاجان مراجعة.";
  return `${count} مفاهيم تحتاج مراجعة.`;
}
