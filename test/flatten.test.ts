import { describe, it, expect } from "vitest";
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

  it("de-duplicates and sorts", () => {
    expect(extractInterpolationVars("{{b}} {a} {{b}}")).toEqual(["a", "b"]);
  });
});
