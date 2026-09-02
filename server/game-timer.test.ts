import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("quiz timer configuration", () => {
  it("uses 25 seconds consistently for every question", () => {
    const source = readFileSync("client/src/components/GameShell.tsx", "utf8");
    expect(source).toContain("const QUESTION_TIME_LIMIT = 25;");
    expect(source).toContain("useState(QUESTION_TIME_LIMIT)");
    expect(source).not.toContain("setTimeLeft(15)");
  });
});
