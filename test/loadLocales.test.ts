import { describe, it, expect } from "vitest";
import path from "path";
import { loadLocales } from "../src/core/loadLocales";

const fx = (name: string) => path.join(__dirname, "fixtures", name);

describe("loadLocales", () => {
  it("loads flat JSON locales with flattened keys", () => {
    const locales = loadLocales(fx("json-flat"));
    const en = locales.find((l) => l.locale === "en")!;
    expect(en.keys["home.title"]).toBe("Welcome");
    expect(en.keys["common.ok"]).toBe("OK");
  });

  it("loads namespaced directories with namespace-prefixed keys", () => {
    const locales = loadLocales(fx("namespaced"));
    const en = locales.find((l) => l.locale === "en")!;
    expect(en.keys["common.save"]).toBe("Save");
    expect(en.keys["auth.login"]).toBe("Log in");
  });

  it("parses TS locales via AST (named var, types, numbers, template literals)", () => {
    const en = loadLocales(fx("ts-locales")).find((l) => l.locale === "en")!;
    expect(en.keys["home.title"]).toBe("Welcome");
    expect(en.keys["home.count"]).toBe("3");
    expect(en.keys["legal"]).toContain("Multi");
  });

  it("parses TS locales using `satisfies` and `as const`", () => {
    const en = loadLocales(fx("ts-satisfies")).find((l) => l.locale === "en")!;
    expect(en.keys["greeting"]).toBe("Hi");
    expect(en.keys["nested.deep"]).toBe("value");
  });

  it("throws on a malformed locale instead of skipping it silently", () => {
    expect(() => loadLocales(fx("malformed"))).toThrow(/Could not parse/);
  });

  it("throws when the locales directory does not exist", () => {
    expect(() => loadLocales(fx("does-not-exist"))).toThrow(/not found/);
  });

  it("rejects a JSON locale that isn't an object (array/primitive)", () => {
    expect(() => loadLocales(fx("non-object"))).toThrow(/Could not parse/);
  });
});
