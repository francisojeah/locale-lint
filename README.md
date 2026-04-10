# locale-lint

> Zero-config i18n linter for React, React Native & Next.js.  
> Catch missing, unused, and hardcoded strings before they ship.

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

| Check | Description |
|---|---|
| ❌ **Missing keys** | Keys in your base locale (`en`) that are missing from other locales |
| ❌ **Undefined keys** | Keys called via `t('key')` in code that don't exist in any locale file |
| ⚠️ **Unused keys** | Keys defined in locale files that are never used in code |
| 🚨 **Hardcoded text** | Raw visible strings in JSX that should be translated |
| ❌ **Interpolation mismatches** | `{{name}}` in EN but `{nome}` in PT — variables that don't match |

---

## Install

```bash
# Run without installing (recommended)
npx locale-lint check

# Or install globally
npm install -g locale-lint

# Or as a dev dependency
npm install --save-dev locale-lint
```

---

## Usage

### Zero-config (auto-detects everything)

Just run in your project root:

```bash
npx locale-lint check
```

locale-lint automatically finds:
- **Locales**: looks for `locales/`, `translations/`, `i18n/`, `src/locales/`, `public/locales/`
- **Source files**: scans `src/`, `app/`, `pages/`, `components/`, `screens/`

### With options

```bash
# Specify paths explicitly
npx locale-lint check --src src --locales public/locales

# Different base locale
npx locale-lint check --base fr

# Skip unused key detection (useful during active development)
npx locale-lint check --ignore-unused

# Skip hardcoded string detection
npx locale-lint check --ignore-hardcoded

# JSON output for CI pipelines
npx locale-lint check --json
```

---

## Configuration

Run `npx locale-lint init` to create a `locale-lint.config.json`:

```json
{
  "src": ["src"],
  "locales": "locales",
  "baseLocale": "en",
  "extensions": ["js", "ts", "jsx", "tsx"],
  "minHardcodedLength": 3,
  "ignoreKeys": ["common.appName"],
  "exclude": ["node_modules", "dist", "build", ".next"]
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `src` | `string[]` | auto-detect | Directories to scan for source code |
| `locales` | `string` | auto-detect | Directory containing locale files |
| `baseLocale` | `string` | `"en"` | The source-of-truth locale |
| `extensions` | `string[]` | `["js","ts","jsx","tsx"]` | File extensions to scan |
| `minHardcodedLength` | `number` | `3` | Min string length to flag as hardcoded |
| `ignoreKeys` | `string[]` | `[]` | Keys to exclude from all checks |
| `exclude` | `string[]` | `["node_modules","dist"]` | Glob patterns to exclude |

---

## Translation file formats

### Flat JSON
```
locales/
  en.json
  pt.json
  fr.json
```

### Namespaced (i18next style)
```
locales/
  en/
    common.json
    auth.json
  pt/
    common.json
    auth.json
```
Keys are automatically prefixed: `common.save`, `auth.login.title`

### TypeScript export
```ts
// locales/en.ts
export default {
  home: {
    title: "Dashboard",
  }
}
```

---

## Library compatibility

locale-lint works with any library that uses `t('key')` style calls:

| Library | Works? | Notes |
|---|---|---|
| **react-i18next** | ✅ | Full support |
| **next-intl** | ✅ | Full support |
| **i18next** | ✅ | Full support |
| **i18n-js** | ✅ | Detects `i18n.t('key')` |
| **react-intl / FormatJS** | ✅ | Detects `intl.formatMessage({id: 'key'})` |
| **vue-i18n** | ✅ | Detects `$t('key')` |
| **Lingui** | ⚠️ | JSON catalogs work; `.po` files not yet supported |

---

## CI Integration

locale-lint exits with **code 1** when issues are found, making it easy to gate PRs:

```yaml
# .github/workflows/i18n.yml
name: i18n check
on: [push, pull_request]

jobs:
  locale-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx locale-lint check
```

### JSON output for custom reporting

```bash
npx locale-lint check --json > i18n-report.json
```

---

## add to package.json scripts

```json
{
  "scripts": {
    "i18n:check": "locale-lint check",
    "i18n:check:ci": "locale-lint check --json"
  }
}
```

---

## What's ignored

- Dynamic keys: `` t(`key.${variable}`) `` — can't be statically resolved
- Numbers in JSX: `<Text>42</Text>`
- Whitespace-only text nodes
- Strings shorter than `minHardcodedLength` (default: 3 chars)
- Content inside `<code>`, `<pre>`, `<script>`, `<style>`, `<svg>`
- Punctuation clusters: `—`, `·`, `|`

---

## Project structure

```
src/
  cli.ts                  # Commander CLI entry point
  core/
    runner.ts             # Main lint pipeline orchestrator
    loadLocales.ts        # JSON + TS locale file parser
    scanFiles.ts          # Glob-based source file scanner
    extractKeys.ts        # AST-based t('key') extractor
    detectHardcoded.ts    # JSX hardcoded string detector
    compareLocales.ts     # Missing/unused/undefined key comparison
  utils/
    flatten.ts            # Nested object → dot-notation flattener
    logger.ts             # Chalk-powered terminal output
    config.ts             # Config file + auto-detection
  types/
    index.ts              # Shared TypeScript interfaces
```

---

## Roadmap

- [ ] `--fix` flag — auto-fill missing keys with `"TODO: translate"`
- [ ] Watch mode for development (`locale-lint watch`)
- [ ] YAML locale file support
- [ ] `.po` file support (Lingui)
- [ ] HTML report output
- [ ] Translation coverage percentage budgets
- [ ] Plural form validation

---

## License

MIT
