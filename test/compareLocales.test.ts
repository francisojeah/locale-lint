import { describe, it, expect } from "@jest/globals";
import { compareLocales } from "../src/core/compareLocales";
import type { TranslationFile, UsedKey } from "../src/types/index";

function file(locale: string, keys: Record<string, string>): TranslationFile {
  return { locale, filePath: `${locale}.json`, keys };
}

function used(keys: string[]): Map<string, UsedKey> {
  return new Map(
    keys.map((k) => [k, { key: k, file: "a.tsx", line: 1, column: 0 }]),
  );
}

function usedFrom(entries: [string, string][]): Map<string, UsedKey> {
  return new Map(
    entries.map(([k, file]) => [k, { key: k, file, line: 1, column: 0 }]),
  );
}

describe("compareLocales", () => {
  it("reports keys missing from a target locale", () => {
    const r = compareLocales(
      [file("en", { a: "A", b: "B" }), file("pt", { a: "A" })],
      used(["a", "b"]),
      "en",
    );
    expect(r.missingKeys).toEqual({ pt: ["b"] });
  });

  it("reports extra keys present only in a target locale", () => {
    const r = compareLocales(
      [file("en", { a: "A" }), file("pt", { a: "A", stale: "S" })],
      used(["a"]),
      "en",
    );
    expect(r.extraKeys).toEqual({ pt: ["stale"] });
  });

  it("reports undefined keys used in code but not defined", () => {
    const r = compareLocales([file("en", { a: "A" })], used(["a", "ghost"]), "en");
    expect(r.undefinedKeys.map((k) => k.key)).toEqual(["ghost"]);
  });

  it("reports unused keys defined but never used", () => {
    const r = compareLocales([file("en", { a: "A", b: "B" })], used(["a"]), "en");
    expect(r.unusedKeys).toEqual(["b"]);
  });

  it("does not flag plural children of a used key as unused", () => {
    const r = compareLocales(
      [file("en", { "count.one": "1", "count.other": "many" })],
      used(["count"]),
      "en",
    );
    expect(r.unusedKeys).toEqual([]);
    expect(r.undefinedKeys).toEqual([]);
  });

  it("flags interpolation variable set differences, ignoring ICU vs brace style", () => {
    const r = compareLocales(
      [
        file("en", { greet: "Hi {{name}}" }),
        file("pt", { greet: "Olá {nome}" }),
      ],
      used(["greet"]),
      "en",
    );
    expect(r.interpolationMismatches).toHaveLength(1);
  });

  it("treats matching ICU and brace vars as equal", () => {
    const r = compareLocales(
      [
        file("en", { n: "{count, plural, other {# x}}" }),
        file("pt", { n: "{count} x" }),
      ],
      used(["n"]),
      "en",
    );
    expect(r.interpolationMismatches).toEqual([]);
  });
});

describe("compareLocales — undefined key resolution", () => {
  const en = file("en", {
    "Orders.actions.assign": "Assign",
    "Orders.actions.cancel": "Cancel",
    "Claims.actions.cancel": "Cancel",
  });

  it("resolves a unique suffix match by default (suffix mode)", () => {
    const r = compareLocales([en], used(["actions.assign"]), "en");
    expect(r.undefinedKeys).toEqual([]);
  });

  it("still flags an ambiguous suffix (>1 namespace) by default", () => {
    const r = compareLocales([en], used(["actions.cancel"]), "en");
    expect(r.undefinedKeys.map((k) => k.key)).toEqual(["actions.cancel"]);
  });

  it("still flags a genuinely missing key", () => {
    const r = compareLocales([en], used(["actions.ghost"]), "en");
    expect(r.undefinedKeys.map((k) => k.key)).toEqual(["actions.ghost"]);
  });

  it("strict mode disables suffix resolution", () => {
    const r = compareLocales([en], used(["actions.assign"]), "en", {
      undefinedKeyResolution: "strict",
      namespaceAgnosticFiles: [],
    });
    expect(r.undefinedKeys.map((k) => k.key)).toEqual(["actions.assign"]);
  });

  it("namespaceAgnosticFiles clears an ambiguous key from a matching file", () => {
    const r = compareLocales(
      [en],
      usedFrom([["actions.cancel", "src/lib/constants/orders.ts"]]),
      "en",
      {
        undefinedKeyResolution: "suffix",
        namespaceAgnosticFiles: ["src/lib/constants/**"],
      },
    );
    expect(r.undefinedKeys).toEqual([]);
  });

  it("does not clear an ambiguous key from a non-matching file", () => {
    const r = compareLocales(
      [en],
      usedFrom([["actions.cancel", "src/components/Foo.tsx"]]),
      "en",
      {
        undefinedKeyResolution: "suffix",
        namespaceAgnosticFiles: ["src/lib/constants/**"],
      },
    );
    expect(r.undefinedKeys.map((k) => k.key)).toEqual(["actions.cancel"]);
  });
});
