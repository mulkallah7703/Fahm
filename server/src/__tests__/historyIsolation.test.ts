import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HISTORY_NOT_FOUND } from "../config/history.js";

describe("history ownership isolation", () => {
  it("looks up details only by session and authenticated student", () => {
    const repo = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../repositories/historyRepository.ts"),
      "utf8",
    );
    const controller = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../controllers/historyController.ts"),
      "utf8",
    );
    expect(repo).toContain("s.SessionId = @sessionId");
    expect(repo).toContain("s.StudentProfileId = @studentProfileId");
    expect(controller).toContain("NotFoundError");
    expect(controller).toContain("HISTORY_NOT_FOUND");
    expect(HISTORY_NOT_FOUND).toBe("لم يتم العثور على الجلسة.");
  });

  it("does not accept studentId from the client query", () => {
    const validators = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../validators/historyValidators.ts"),
      "utf8",
    );
    expect(validators).not.toMatch(/studentId/);
    expect(validators).not.toMatch(/studentProfileId/);
    expect(validators).not.toMatch(/userId/);
  });
});
