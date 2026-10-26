import { describe, it, expect } from "@jest/globals";
import path from "path";
import { resolveConfig } from "../src/utils/config";

const project = path.join(__dirname, "fixtures", "project");

describe("resolveConfig", () => {
  it("auto-detects the locales and src directories", () => {
    const c = resolveConfig(project, {});
    expect(c.locales).toBe(path.join(project, "locales"));
    expect(c.src).toContain("src");
    expect(c.baseLocale).toBe("en");
  });

  it("honors explicit flags over auto-detection", () => {
    const c = resolveConfig(project, {
      locales: "locales",
      src: "src",
      base: "fr",
    });
    expect(c.baseLocale).toBe("fr");
    expect(c.locales).toBe(path.join(project, "locales"));
    expect(c.src).toEqual(["src"]);
  });

  it("applies defaults (extensions, namespaceHooks, resolution)", () => {
    const c = resolveConfig(project, {});
    expect(c.extensions).toContain("tsx");
    expect(c.namespaceHooks).toContain("useTranslations");
    expect(c.undefinedKeyResolution).toBe("suffix");
  });

  it("throws a helpful error when no locales dir can be found", () => {
    const noLocales = path.join(__dirname, "fixtures", "source");
    expect(() => resolveConfig(noLocales, {})).toThrow(/locales/i);
  });
});
