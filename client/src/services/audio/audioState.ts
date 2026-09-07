export type AudioStatus = "idle" | "loading" | "playing" | "paused" | "stopped" | "completed" | "error";

export type AudioCommand =
  | "load"
  | "ready"
  | "play"
  | "pause"
  | "resume"
  | "stop"
  | "ended"
  | "fail";

export function reduceAudioStatus(current: AudioStatus, command: AudioCommand): AudioStatus {
  switch (command) {
    case "load":
      return "loading";
    case "ready":
      return current === "loading" ? "idle" : current;
    case "play":
      return "playing";
    case "pause":
      return current === "playing" ? "paused" : current;
    case "resume":
      return current === "paused" ? "playing" : current;
    case "stop":
      return "stopped";
    case "ended":
      return "completed";
    case "fail":
      return "error";
    default:
      return current;
  }
}

export function splitSpokenSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?؟])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || Boolean(target.isContentEditable);
}

export function inferVoiceGender(name: string): "female" | "male" | "unknown" {
  const value = name.toLowerCase();
  if (/female|woman|أنثى|انثى|noura|zira|sara|salma/.test(value)) return "female";
  if (/male|man|ذكر|naayf|omar|david|mark/.test(value)) return "male";
  return "unknown";
}
