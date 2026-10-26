import { describe, it, expect } from "@jest/globals";
import { flattenObject, extractInterpolationVars } from "../src/utils/flatten";

describe("flattenObject", () => {
  it("flattens nested objects to dot keys", () => {
    expect(
      flattenObject({ home: { title: "Hi", sub: { label: "Yo" } } }),
    ).toEqual({ "home.title": "Hi", "home.sub.label": "Yo" });
  });

  it("coerces non-string leaves", () => {
    expect(flattenObject({ a: 1, b: true, c: null })).toEqual({
      a: "1",
      b: "true",
      c: "",
    });
  });

  it("indexes array-valued translations instead of joining them", () => {
    expect(flattenObject({ steps: ["one", "two"] })).toEqual({
      "steps.0": "one",
      "steps.1": "two",
    });
  });
});

describe("extractInterpolationVars", () => {
  it("reads i18next {{var}} style", () => {
    expect(extractInterpolationVars("Hi {{name}}")).toEqual(["name"]);
  });

  it("reads FormatJS {var} style", () => {
    expect(extractInterpolationVars("You have {count} items")).toEqual([
      "count",
    ]);
  });

  it("reads ICU plural/select argument names", () => {
    expect(
      extractInterpolationVars("{count, plural, one {# item} other {# items}}"),
    ).toEqual(["count"]);
    expect(
      extractInterpolationVars("{gender, select, male {he} other {they}}"),
    ).toEqual(["gender"]);
  });

  it("does not treat translated ICU option text as variables", () => {
    // By design: option bodies are translated text, not variables. Recursing
    // would flag a false mismatch on every select/plural across locales.
    expect(
      extractInterpolationVars("{gender, select, male {he} other {they}}"),
    ).toEqual(["gender"]);
  });

  it("de-duplicates and sorts", () => {
    expect(extractInterpolationVars("{{b}} {a} {{b}}")).toEqual(["a", "b"]);
  });

  it("does not invent a variable from an unterminated brace", () => {
    expect(extractInterpolationVars("hello {a")).toEqual([]);
    expect(extractInterpolationVars("{a} {b")).toEqual(["a"]);
  });

  it("returns [] for a string with no interpolation", () => {
    expect(extractInterpolationVars("100% done, no vars")).toEqual([]);
  });
});
