import { describe, it, expect, jest, afterEach } from "@jest/globals";
import chalk from "chalk";
import { printResult, printScanning } from "../src/utils/logger";
import type { LintResult } from "../src/types/index";

// Force plain output so assertions don't depend on the terminal's color support.
chalk.level = 0;

const result: LintResult = {
  missingKeys: { pt: ["home.title"] },
  extraKeys: { pt: ["home.stale"] },
  unusedKeys: ["common.unused"],
  undefinedKeys: [{ key: "home.ghost", file: "src/A.tsx", line: 3, column: 2 }],
  hardcodedStrings: [{ text: "Hello", file: "src/A.tsx", line: 1, column: 4 }],
  interpolationMismatches: [
    {
      key: "home.welcome",
      baseLocale: "en",
      targetLocale: "pt",
      baseVars: ["name"],
      targetVars: [],
    },
  ],
  meta: { filesScanned: 2, localesFound: ["en", "pt"], totalKeys: 5, durationMs: 7 },
};

const clean: LintResult = {
  missingKeys: {},
  extraKeys: {},
  unusedKeys: [],
  undefinedKeys: [],
  hardcodedStrings: [],
  interpolationMismatches: [],
  meta: { filesScanned: 1, localesFound: ["en"], totalKeys: 1, durationMs: 1 },
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("logger", () => {
  it("emits valid JSON with the full result shape in json mode", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    printResult(result, "json");
    const parsed = JSON.parse(log.mock.calls[0][0] as string);
    expect(Object.keys(parsed).sort()).toContain("extraKeys");
    expect(parsed.missingKeys.pt).toEqual(["home.title"]);
  });

  it("prints every section without throwing in pretty mode", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    expect(() => printResult(result, "pretty")).not.toThrow();
    const out = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(out).toMatch(/Missing in pt/);
    expect(out).toMatch(/Extra in pt/);
    expect(out).toMatch(/Undefined keys/);
    expect(out).toMatch(/Interpolation mismatches/);
  });

  it("reports a clean result", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    printResult(clean, "pretty");
    expect(log.mock.calls.map((c) => String(c[0])).join("\n")).toMatch(
      /All good/,
    );
  });

  it("printScanning does not throw", () => {
    jest.spyOn(process.stdout, "write").mockReturnValue(true);
    expect(() => printScanning(["src"], "locales")).not.toThrow();
  });
});
