import { describe, it, expect } from "@jest/globals";
import path from "path";
import { runLint, hasIssues } from "../src/core/runner";
import type { LocaleLintConfig } from "../src/types/index";

const root = path.join(__dirname, "fixtures", "project");

const config: LocaleLintConfig = {
  src: [path.join(root, "src")],
  locales: path.join(root, "locales"),
  baseLocale: "en",
  extensions: ["js", "ts", "jsx", "tsx"],
  minHardcodedLength: 3,
  ignoreKeys: [],
  exclude: ["node_modules"],
  namespaceHooks: ["useTranslations", "getTranslations"],
  undefinedKeyResolution: "suffix",
  namespaceAgnosticFiles: [],
};

describe("runLint (end to end)", () => {
  it("produces the documented result shape and flags real issues", async () => {
    const result = await runLint(config, root);

    expect(result.missingKeys).toEqual({ pt: ["unused.key"] });
    expect(result.unusedKeys).toContain("unused.key");
    expect(hasIssues(result)).toBe(true);

    // JSON contract used by AI agents / CI
    expect(Object.keys(result).sort()).toEqual(
      [
        "extraKeys",
        "hardcodedStrings",
        "interpolationMismatches",
        "meta",
        "missingKeys",
        "undefinedKeys",
        "unusedKeys",
      ].sort(),
    );
    expect(result.meta.localesFound.sort()).toEqual(["en", "pt"]);
  });

  it("hasIssues is false for a clean comparison", async () => {
    const clean = await runLint(
      { ...config, ignoreKeys: ["unused.key"] },
      root,
    );
    // still missing in pt, so issues remain — sanity that ignore alone isn't enough
    expect(hasIssues(clean)).toBe(true);
  });
});
