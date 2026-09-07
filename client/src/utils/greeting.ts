export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "صباح الخير";
  return "مساء الخير";
}

export function firstNameOf(displayName: string, firstName?: string | null): string {
  if (firstName && firstName.trim()) return firstName.trim();
  return displayName.split(" ")[0] ?? displayName;
}
