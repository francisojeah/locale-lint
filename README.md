[![npm version](https://img.shields.io/npm/v/locale-lint.svg?style=flat-square)](https://www.npmjs.com/package/locale-lint)
[![npm downloads](https://img.shields.io/npm/dm/locale-lint.svg?style=flat-square)](https://www.npmjs.com/package/locale-lint)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

# locale-lint

> You shipped "Welcome to our platform" to 50,000 Portuguese users. Never again.

Zero-config i18n linter for React, React Native & Next.js. One command catches every translation problem before it ships.

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
  20 issues found in 123ms
```

---

## What it detects

| | Check | Description |
|---|---|---|
| ❌ | **Missing keys** | Keys in `en` that are absent from other locales |
| ❌ | **Undefined keys** | `t('key')` calls in code with no matching translation |
| ⚠️ | **Unused keys** | Keys defined in locale files but never called in code |
| 🚨 | **Hardcoded text** | Raw visible strings in JSX that should go through `t()` |
| ❌ | **Interpolation mismatches** | `{{name}}` in EN but `{nome}` in PT |

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
npx locale-lint check --ignore-hardcoded                   # skip hardcoded string check
npx locale-lint check --json                               # machine-readable output
```

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
  "exclude": ["node_modules", "dist", "build", ".next"]
}
```

---

## Library support

Works with any library that uses `t('key')` or similar patterns:

| Library | Call pattern | Status |
|---|---|---|
| react-i18next | `t('key')` | ✅ |
| next-intl | `t('key')` | ✅ |
| i18next | `i18n.t('key')` | ✅ |
| i18n-js | `i18n.t('key')` | ✅ |
| react-intl / FormatJS | `intl.formatMessage({id: 'key'})` | ✅ |
| vue-i18n | `$t('key')` | ✅ |

---

## File formats

**Flat JSON** — `locales/en.json`, `locales/pt.json`

**Namespaced** — `locales/en/common.json` → keys become `common.save`, `common.cancel`

**TypeScript** — `export default { ... }`, `const en: Type = { ... }; export default en`, `satisfies`, `as const` all supported

---

## CI Integration

locale-lint exits with code `1` when issues are found — drop it straight into any pipeline:

```yaml
# .github/workflows/i18n.yml
- run: npx locale-lint check
```

```json
// package.json
"scripts": {
  "i18n:check": "locale-lint check"
}
```

---

## What's ignored

Dynamic keys like `` t(`key.${x}`) `` are intentionally skipped — they can't be statically resolved. Numbers, whitespace, and strings under `minHardcodedLength` (default: 3) are also ignored, as is content inside `<code>`, `<pre>`, `<script>`, and `<svg>`.

---

## License

MIT
