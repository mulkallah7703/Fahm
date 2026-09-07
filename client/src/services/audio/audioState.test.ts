import { describe, expect, it } from "vitest";
import {
  inferVoiceGender,
  isTypingTarget,
  reduceAudioStatus,
  splitSpokenSentences,
} from "./audioState";

describe("audio status machine", () => {
  it("moves through play pause resume stop", () => {
    let status = reduceAudioStatus("idle", "load");
    expect(status).toBe("loading");
    status = reduceAudioStatus(status, "play");
    expect(status).toBe("playing");
    status = reduceAudioStatus(status, "pause");
    expect(status).toBe("paused");
    status = reduceAudioStatus(status, "resume");
    expect(status).toBe("playing");
    status = reduceAudioStatus(status, "stop");
    expect(status).toBe("stopped");
  });

  it("does not treat pause as playing", () => {
    expect(reduceAudioStatus("idle", "pause")).toBe("idle");
  });
});

describe("speech helpers", () => {
  it("splits Arabic sentences for highlighting", () => {
    expect(splitSpokenSentences("الجملة الأولى. الجملة الثانية.")).toEqual([
      "الجملة الأولى.",
      "الجملة الثانية.",
    ]);
  });

  it("does not invent gender from an unknown voice name", () => {
    expect(inferVoiceGender("Microsoft Hedda")).toBe("unknown");
    expect(inferVoiceGender("Microsoft Zira")).toBe("female");
  });

  it("ignores shortcuts while typing", () => {
    const input = document.createElement("input");
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
  });
});
