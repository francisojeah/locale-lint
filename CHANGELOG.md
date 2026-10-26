# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## 2.0.0

This release hardens correctness. Two changes affect what gets reported, so the
major version is bumped.

### Breaking

- **A locale file that fails to parse now fails the run** (exit code `2`) instead
  of being silently skipped. Previously a JSON syntax error (e.g. a trailing comma
  in `pt.json`) dropped that locale from the analysis, so CI could pass green while
  a whole language went unchecked.
  *Migration:* fix the reported syntax error. The error message names the file and
  the exact position.
- **New check: extra keys.** Keys present in a target locale but absent from the base
  locale (stale/orphaned translations) are now reported and cause a non-zero exit.
  *Migration:* remove the stale keys, or add them to the base locale.

### Added

- **next-intl namespace resolution.** `const t = useTranslations('Home')` scopes
  `t('title')` to `Home.title`, resolved automatically. Configure `namespaceHooks` to
  add custom wrapper hooks.
- **Undefined-key suffix resolution** (`undefinedKeyResolution: "suffix"`, default).
  When `t`'s namespace can't be determined (e.g. it was passed in as a parameter), a
  short key like `actions.save` is accepted if exactly one defined key ends with it.
  Set `"strict"` to require exact matches.
- **`namespaceAgnosticFiles`** config — globs of files (e.g. `["src/lib/constants/**"]`)
  that receive `t` as a parameter; a key used there is accepted on any suffix match.
- **`--ignore-undefined`** flag to skip undefined-key detection.

### Changed

- **TS/JS locale files are read via AST only.** The previous loader stripped types
  and `require()`d a temp `.cjs` file written into your repo — an arbitrary-code-
  execution risk that could also leak a temp file if the process was killed. Locale
  files are now parsed without ever executing them.
  *Migration:* the loader reads **static object literals** (`export default {…}`,
  `module.exports = {…}`, named-const exports, `as const`, `satisfies`). Values built
  at runtime — spreads of imported objects, function calls, or template expressions
  like `` `Hi ${brand}` `` — can no longer be resolved and will fail with a clear
  error. Convert such locales to JSON or a static object. (Plain JSON locales are
  unaffected.)
- **Interpolation comparison is ICU-aware** (`{count, plural, ...}`) and compares
  variables as sets, eliminating false mismatches.
- **`obj.t('key')` is only treated as a translation call for known i18n objects**
  (`i18n`, `i18next`, `I18n`, `intl`, `$i18n`), so unrelated `.t()` methods no longer
  produce false "undefined key" reports.

### Fixed

- A JSON locale that isn't an object (a top-level array or primitive) now fails loudly
  instead of producing garbage numeric/per-character keys.
- A syntactically broken TS/JS locale now fails loudly instead of silently guessing a
  partial object via a lossy regex fallback (the fallback was removed).
- Array-valued translations are indexed (`key.0`, `key.1`) instead of being joined into a
  single comma-separated string.
- An unterminated `{` no longer invents a phantom interpolation variable.
- `locale-lint init` reports a friendly error (exit 2) if the config can't be written.
- `namespaceAgnosticFiles` globs match cross-platform (Windows path separators, leading `./`).
- `--version` now reports the real package version.
- A malformed `locale-lint.config.json` now errors clearly instead of being ignored.
- Auto-detection no longer crashes on a dangling symlink in a candidate directory.
- `locale-lint init` and the runtime defaults now share the same `exclude` list.

## 1.0.x

- Initial releases: missing keys, undefined keys, unused keys, hardcoded strings,
  and interpolation mismatch detection for React, React Native and Next.js.
