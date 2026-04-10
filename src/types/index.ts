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
