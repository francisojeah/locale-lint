// ─── locale-lint types ────────────────────────────────────────────────────────

export interface LocaleLintConfig {
  /** Source code directories to scan */
  src: string[];
  /** Directory containing locale JSON/TS files */
  locales: string;
  /** Base locale to compare all others against */
  baseLocale: string;
  /** File extensions to scan */
  extensions: string[];
  /** Minimum string length to flag as hardcoded (avoids flagging "OK", "—") */
  minHardcodedLength: number;
  /** Keys to ignore in unused key detection (e.g. keys used dynamically) */
  ignoreKeys: string[];
  /** Glob patterns to exclude from scanning */
  exclude: string[];
  /**
   * Hooks that bind a namespace to the translator, e.g. next-intl's
   * `const t = useTranslations('NS')`. Add your own wrapper hook here so
   * `t('key')` resolves to `NS.key`. Defaults to next-intl's hooks.
   */
  namespaceHooks: string[];
  /**
   * How to handle a `t('key')` whose namespace couldn't be determined (e.g. `t`
   * was a function parameter). "suffix" (default) accepts the key when exactly
   * one defined key ends with it; "strict" requires an exact match.
   */
  undefinedKeyResolution: "suffix" | "strict";
  /**
   * Globs of files where `t` arrives without a namespace (helpers/constants that
   * receive `t` as a parameter). A key used in these files counts as defined when
   * any defined key matches it by suffix, even if ambiguous.
   */
  namespaceAgnosticFiles: string[];
}

export interface TranslationFile {
  locale: string;
  filePath: string;
  /** Flattened keys: { "home.title": "Welcome", "home.subtitle": "Hello" } */
  keys: Record<string, string>;
}

export interface UsedKey {
  key: string;
  file: string;
  line: number;
  column: number;
}

export interface HardcodedString {
  text: string;
  file: string;
  line: number;
  column: number;
}

export interface InterpolationMismatch {
  key: string;
  baseLocale: string;
  targetLocale: string;
  baseVars: string[];
  targetVars: string[];
}

export interface LintResult {
  /** Keys in base locale missing from other locales */
  missingKeys: Record<string, string[]>;
  /** Keys present in a target locale but absent from the base locale (stale/orphaned) */
  extraKeys: Record<string, string[]>;
  /** Keys present in translation files but never used in code */
  unusedKeys: string[];
  /** Keys used in code but not defined in any locale file */
  undefinedKeys: UsedKey[];
  /** Raw strings found in JSX */
  hardcodedStrings: HardcodedString[];
  /** Interpolation variable mismatches between locales */
  interpolationMismatches: InterpolationMismatch[];
  /** Scan metadata */
  meta: {
    filesScanned: number;
    localesFound: string[];
    totalKeys: number;
    durationMs: number;
  };
}

export type OutputFormat = "pretty" | "json";
