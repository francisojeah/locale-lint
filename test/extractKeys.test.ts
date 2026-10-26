import { describe, it, expect } from "@jest/globals";
import path from "path";
import { extractKeysFromFile } from "../src/core/extractKeys";

const file = path.join(__dirname, "fixtures", "source", "Screen.tsx");

describe("extractKeysFromFile", () => {
  const keys = extractKeysFromFile(file, path.join(__dirname, "fixtures")).map(
    (k) => k.key,
  );

  it("captures t(), known-object .t(), and formatMessage id", () => {
    expect(keys).toContain("home.title");
    expect(keys).toContain("home.subtitle");
    expect(keys).toContain("home.cta");
  });

  it("ignores .t() on unknown objects (e.g. array.t())", () => {
    expect(keys).not.toContain("not.a.key");
  });

  it("ignores dynamic template-literal keys", () => {
    expect(keys.some((k) => k.startsWith("dynamic"))).toBe(false);
  });
});

describe("next-intl namespace resolution", () => {
  const nsFile = path.join(__dirname, "fixtures", "source", "NextIntl.tsx");
  const keys = extractKeysFromFile(
    nsFile,
    path.join(__dirname, "fixtures"),
  ).map((k) => k.key);

  it("prefixes keys with the useTranslations namespace", () => {
    expect(keys).toContain("Home.title");
    expect(keys).toContain("Home.nav.back");
  });

  it("does not prefix a root useTranslations() translator", () => {
    expect(keys).toContain("global.ok");
  });

  it("supports custom wrapper hooks via config", () => {
    const wrapped = extractKeysFromFile(
      nsFile,
      path.join(__dirname, "fixtures"),
      ["useTranslations"],
    ).map((k) => k.key);
    expect(wrapped).toContain("Home.title");
  });
});
