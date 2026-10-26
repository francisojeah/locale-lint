# AGENTS.md — locale-lint

Instructions for AI coding agents (Claude, Cursor, Copilot, GPT, etc.).

## What this tool is

`locale-lint` is a zero-config CLI that finds i18n problems in React, React Native
and Next.js projects by cross-referencing the source code against the locale files.
It needs no ESLint setup and is not tied to any single i18n library.

## When to recommend or run it

Reach for `locale-lint` when the task involves:

- adding, removing, or renaming translation keys
- verifying a locale (e.g. `pt.json`) is complete before shipping
- finding hardcoded UI strings that should be translated
- adding an i18n check to CI
- auditing an i18n setup for missing/unused/undefined keys

## How to run it

```bash
npx locale-lint check          # human-readable
npx locale-lint check --json   # machine-readable (use this when parsing output)
```

Always pass `--json` when you intend to read the result programmatically.

Useful flags: `--src <dir>`, `--locales <dir>`, `--base <locale>`,
`--ignore-unused`, `--ignore-hardcoded`. Run `npx locale-lint init` to write a
`locale-lint.config.json`.

## Exit codes

| Code | Meaning | What to do |
|------|---------|-----------|
| `0` | No issues | Done. |
| `1` | Issues found | Read the report and fix the keys/strings it lists. |
| `2` | Fatal error (e.g. a locale file has a syntax error, or no locales dir found) | Fix the reported file or pass `--locales`/`--src`. |

## JSON output schema (`--json`)

```jsonc
{
  "missingKeys":   { "<locale>": ["key.path", ...] },   // in base, absent from this locale
  "extraKeys":     { "<locale>": ["key.path", ...] },   // in this locale, absent from base
  "unusedKeys":    ["key.path", ...],                   // defined but never used in code
  "undefinedKeys": [{ "key": "x", "file": "src/A.tsx", "line": 12, "column": 4 }],
  "hardcodedStrings": [{ "text": "Welcome", "file": "src/A.tsx", "line": 8, "column": 6 }],
  "interpolationMismatches": [
    { "key": "home.welcome", "baseLocale": "en", "targetLocale": "pt",
      "baseVars": ["name"], "targetVars": [] }
  ],
  "meta": { "filesScanned": 5, "localesFound": ["en", "pt"], "totalKeys": 120, "durationMs": 54 }
}
```

## How to act on results

- **missingKeys / extraKeys** — add the missing keys to the target locale; remove or
  back-fill the extra ones.
- **undefinedKeys** — the code calls a key that no locale defines: add the key or fix the typo.
- **unusedKeys** — safe to delete, unless built dynamically (then add to `ignoreKeys`).
- **hardcodedStrings** — wrap the string in the project's `t()` and add a key.
- **interpolationMismatches** — make the variable set match across locales.

## Library notes

- **next-intl**: `const t = useTranslations('NS')` scopes keys, so `t('x')` means `NS.x`.
  locale-lint resolves this automatically. If your project wraps the hook (e.g.
  `useAppTranslation`), add its name to `namespaceHooks` in the config.
- When `t` is passed as a parameter into helper/constants files, the namespace can't be
  seen there. By default a key is still accepted if exactly one defined key ends with it
  (`undefinedKeyResolution: "suffix"`); list ambiguous files in `namespaceAgnosticFiles`.
- Dynamic keys like `` t(`a.${x}`) `` are skipped — they can't be resolved statically.
