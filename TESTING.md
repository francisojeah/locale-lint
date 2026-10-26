# Testing guide

Read this before writing or changing tests. It's the source of truth for how tests work
in this repo.

**Stack: [Jest](https://jestjs.io) + ts-jest on Node** — the same runner used across the
rest of the org. This is a Node CLI of pure functions over files and strings, so there are
no React components to render and no `jest-expo`/`@testing-library` setup. Tests live in
`test/` and end in `.test.ts`; fixtures live in `test/fixtures/`. Import test globals from
`@jest/globals`.

## What to test

- **Test behaviour, not implementation.** Assert what a function returns or what the CLI
  outputs — the keys reported, the exit-relevant `LintResult`, the printed sections — not
  internal calls.
- **Unit** = one module with real inputs and outputs (`flatten`, `compareLocales`,
  `loadLocales`, `extractKeys`, `config`, `detectHardcoded`).
- **End-to-end** = drive `runLint` over a fixture project and assert the whole `LintResult`
  (see `test/runLint.test.ts`).
- **Every bug fix ships with a failing-first test.** A fixture that reproduces the bug is the
  fastest path to a fix and prevents regressions.
- **Don't over-test.** One clear assertion per behaviour. Don't manufacture cases with no
  distinct behaviour.

## Fixtures

Put sample locale files and source under `test/fixtures/<case>/`. Reuse existing fixtures
(`json-flat`, `namespaced`, `ts-locales`, `ts-satisfies`, `project`, `source`, `hardcoded`)
before adding a new one. A "malformed" fixture is a legitimate, intentional fixture — that's
how we test the fail-loud paths.

## Coverage

`npm run test:coverage` runs the report; **CI enforces the thresholds in `jest.config.js`**
(85% statements/lines, 75% branches, 90% functions). `src/types/**` and `src/cli.ts` (thin
commander wiring) are excluded because they carry no meaningful logic. Coverage is a
by-product of testing real behaviour — never add assertion-free tests to lift the number.

## Before committing

The **pre-commit hook** (`.husky/pre-commit`) runs `npm run build && npm test`, so a type
error or a failing test blocks the commit. Vitest was avoided precisely so this hook is
robust: Jest has no platform-specific native binaries, so it runs the same under any Node
(unlike rollup-based runners, which break when git hooks use a different Node arch than your
shell). CI runs `npm run test:coverage` on every push as the final gate.

## Canonical example

```ts
import { describe, it, expect } from "@jest/globals";
import { compareLocales } from "../src/core/compareLocales";

describe("compareLocales", () => {
  it("reports keys missing from a target locale", () => {
    const r = compareLocales(
      [
        { locale: "en", filePath: "en.json", keys: { a: "A", b: "B" } },
        { locale: "pt", filePath: "pt.json", keys: { a: "A" } },
      ],
      new Map([["a", { key: "a", file: "x.tsx", line: 1, column: 0 }]]),
      "en",
    );
    expect(r.missingKeys).toEqual({ pt: ["b"] });
  });
});
```
