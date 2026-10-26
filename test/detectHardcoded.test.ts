import { describe, it, expect } from "vitest";
import path from "path";
import { detectHardcodedStrings } from "../src/core/detectHardcoded";

const file = path.join(__dirname, "fixtures", "hardcoded", "Screen.tsx");
const texts = detectHardcodedStrings(file, path.join(__dirname, "fixtures")).map(
  (h) => h.text,
);

describe("detectHardcodedStrings", () => {
  it("flags visible JSX text and UI-copy attributes", () => {
    expect(texts).toContain("Welcome to the platform");
    expect(texts).toContain("Enter your email"); // placeholder
    expect(texts).toContain("Logo"); // alt
  });

  it("ignores expressions, numbers, short strings, and ignored tags", () => {
    expect(texts).not.toContain("name"); // {name} expression
    expect(texts).not.toContain("42"); // numeric
    expect(texts).not.toContain("OK"); // below minLength
    expect(texts).not.toContain("const x = 1"); // inside <code>
  });
});
