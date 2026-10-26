[![npm version](https://img.shields.io/npm/v/locale-lint.svg?style=flat-square)](https://www.npmjs.com/package/locale-lint)
[![npm downloads](https://img.shields.io/npm/dm/locale-lint.svg?style=flat-square)](https://www.npmjs.com/package/locale-lint)
[![CI](https://img.shields.io/github/actions/workflow/status/francisojeah/locale-lint/ci.yml?branch=main&style=flat-square)](https://github.com/francisojeah/locale-lint/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

# locale-lint

> You shipped "Welcome to our platform" to 50,000 Portuguese users. Never again.

The zero-config i18n linter for **React Native, React & Next.js**. It reads your
*code* — not just your JSON — to catch missing, extra, unused, and undefined keys,
hardcoded strings, and interpolation mismatches. One command, no ESLint setup, not
tied to any single i18n library.

```
npx locale-lint check
```

```
  locale-lint — scanning 3 files across 2 locales
  ────────────────────────────────────────────────────────

  ❌ Missing in pt (3)
     · auth.login.noAccount
     · auth.login.signupLink
     · home.oldWidget

  ⚠️  Extra in pt — not in base locale (1)
     · home.legacyBanner

  ❌ Undefined keys — used in code, missing from all locales (2)
     · auth.loginButton  →  src/screens/LoginScreen.tsx:35
     · home.nonExistentKey  →  src/screens/HomeScreen.tsx:40

  ⚠️  Unused keys — defined but never used in code (8)
     · auth.signup.title
     · common.cancel
     · home.oldWidget

  🚨 Hardcoded text — raw strings in JSX (6)
     · src/screens/LoginScreen.tsx:16  →  "Welcome to our platform"
     · src/screens/HomeScreen.tsx:23   →  "Your Statistics"

  ❌ Interpolation mismatches (1)
     · home.welcome
       en: {name}  →  pt: {nome}

  ────────────────────────────────────────────────────────
  21 issues found in 123ms
```

<img width="1280" height="775" alt="locale-lint terminal output" src="https://github.com/user-attachments/assets/91912d86-757f-4116-95db-97dd5597fd3b" />

---

## What it detects

| | Check | Description |
|---|---|---|
| ❌ | **Missing keys** | Keys in the base locale absent from another locale |
| ⚠️ | **Extra keys** | Keys in a locale that don't exist in the base (stale/orphaned) |
| ❌ | **Undefined keys** | `t('key')` calls in code with no matching translation |
| ⚠️ | **Unused keys** | Keys defined in locale files but never called in code |
| 🚨 | **Hardcoded text** | Raw visible strings in JSX that should go through `t()` |
| ❌ | **Interpolation mismatches** | `{{name}}` in EN but `{nome}` in PT |

---

## Why locale-lint

Most i18n tools do one slice of the job. locale-lint does the whole check in one
zero-config command, and it works for React Native — which most tools ignore.

| Tool | Cross-references code | Hardcoded strings | All-in-one CLI | Zero config | Not library-locked |
|---|:---:|:---:|:---:|:---:|:---:|
| **locale-lint** | ✅ | ✅ | ✅ | ✅ | ✅ |
| li18nt | ❌ (JSON only) | ❌ | ✅ | ✅ | ✅ |
| i18next-cli | ✅ | ❌ | ✅ | ⚠️ | ❌ (i18next) |
| eslint-plugin-i18next | ✅ | ⚠️ | ❌ (ESLint) | ❌ | ❌ (i18next) |
| i18n-ally | ✅ | ⚠️ | ❌ (IDE only) | ⚠️ | ✅ |

---

## Install

```bash
# Run without installing
npx locale-lint check

# Or add to your project
npm install --save-dev locale-lint
```

---

## Usage

### Zero-config

Run this in your project root. locale-lint finds your locale files and source code automatically:

```bash
npx locale-lint check
```

Auto-detects: `locales/`, `translations/`, `i18n/`, `src/locales/`, `src/i18n/translations/`, `public/locales/`, `messages/`, and more.

### Options

```bash
npx locale-lint check --src src --locales public/locales   # explicit paths
npx locale-lint check --base fr                            # different base locale
npx locale-lint check --ignore-unused                      # skip unused key check
npx locale-lint check --ignore-undefined                   # skip undefined key check
npx locale-lint check --ignore-hardcoded                   # skip hardcoded string check
npx locale-lint check --json                               # machine-readable output
```

> **Tip — large codebases that pass `t` around as a prop:** undefined/unused
> detection relies on seeing `t('key')` at the call site, so it can be noisy when
> `t` is forwarded through props or helpers. Run
> `--ignore-unused --ignore-undefined` to focus on the checks that compare locale
> files directly (missing keys, extra keys, interpolation) — those are exact
> regardless of how `t` is used.

### Config file

Run `npx locale-lint init` to generate `locale-lint.config.json`:

```json
{
  "src": ["src"],
  "locales": "locales",
  "baseLocale": "en",
  "extensions": ["js", "ts", "jsx", "tsx"],
  "minHardcodedLength": 3,
  "ignoreKeys": [],
  "exclude": ["node_modules", "dist", "build", ".next"],
  "namespaceHooks": ["useTranslations", "getTranslations"],
  "undefinedKeyResolution": "suffix",
  "namespaceAgnosticFiles": []
}
```

---

## Library support

Works with any library that uses `t('key')` or similar patterns:

| Library | Call pattern | Status |
|---|---|---|
| react-i18next | `t('key')` | ✅ |
| next-intl | `t('key')` (namespace-aware) | ✅ |
| i18next | `i18n.t('key')` | ✅ |
| i18n-js | `i18n.t('key')` | ✅ |
| react-intl / FormatJS | `intl.formatMessage({id: 'key'})` | ✅ |
| vue-i18n | `$t('key')` | ⚠️ `.js`/`.ts` only — `.vue` SFCs aren't parsed yet |

### next-intl namespaces

next-intl scopes keys to a namespace: `const t = useTranslations('Home')` means
`t('title')` resolves to `Home.title`. locale-lint understands this automatically.

If you wrap the hook (e.g. `const t = useAppTranslation('Home')`), add your wrapper
to `namespaceHooks` so the scoping is still resolved:

```json
{ "namespaceHooks": ["useTranslations", "getTranslations", "useAppTranslation"] }
```

When `t` is **passed into a helper or constants file** as a parameter, locale-lint
can't see the namespace there. By default (`undefinedKeyResolution: "suffix"`) it still
resolves a key when exactly one defined key ends with it. For files where keys remain
ambiguous (e.g. shared `actions.*` words), list them in `namespaceAgnosticFiles` so any
suffix match is accepted:

```json
{ "namespaceAgnosticFiles": ["src/lib/constants/**", "src/lib/utils/**"] }
```

Set `"undefinedKeyResolution": "strict"` to require exact matches instead.

---

## File formats

**Flat JSON** — `locales/en.json`, `locales/pt.json`

**Namespaced** — `locales/en/common.json` → keys become `common.save`, `common.cancel`

**TypeScript** — `export default { ... }`, `const en: Type = { ... }; export default en`, `satisfies`, `as const` all supported

---

## CI Integration

locale-lint exits `0` when clean, `1` when issues are found, and `2` on a fatal
error (e.g. a locale file with a syntax error) — drop it straight into any pipeline:

```yaml
# .github/workflows/i18n.yml
- run: npx locale-lint check
```

Or add to your `package.json` scripts:

```json
"scripts": {
  "i18n:check": "locale-lint check"
}
```

---

## Using with AI agents

locale-lint ships an [`AGENTS.md`](AGENTS.md) and [`llms.txt`](llms.txt) so coding
agents (Claude, Cursor, Copilot) know when to run it and how to read its output.
Use `--json` for machine-readable results — the schema is documented in `AGENTS.md`.

---

## What's ignored

Dynamic keys like `` t(`key.${x}`) `` are intentionally skipped — they can't be statically resolved. Numbers, whitespace, and strings under `minHardcodedLength` (default: 3) are also ignored, as is content inside `<code>`, `<pre>`, `<script>`, and `<svg>`.

---

## Troubleshooting

### Keys show `en.` or `pt.` prefix in output

locale-lint picked a parent folder instead of your actual translations folder. Fix it permanently:

```bash
npx locale-lint init
```

Then open `locale-lint.config.json` and set `"locales"` to your exact translations path:

```json
{ "locales": "path/to/your/translations" }
```

---

## License

MIT
