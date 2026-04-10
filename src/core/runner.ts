import type { LocaleLintConfig, LintResult } from "../types/index";
import { scanFiles } from "./scanFiles";
import { extractKeysFromFile, deduplicateKeys } from "./extractKeys";
import { detectHardcodedStrings } from "./detectHardcoded";
import { loadLocales } from "./loadLocales";
import { compareLocales } from "./compareLocales";

/**
 * Main lint pipeline — runs all checks and returns a unified LintResult.
 *
 * Steps:
 *   1. Load and flatten all locale files
 *   2. Scan source files for t('key') calls
 *   3. Scan JSX files for hardcoded strings
 *   4. Compare keys across locales and against code usage
 */
export async function runLint(config: LocaleLintConfig, cwd: string): Promise<LintResult> {
  const startTime = Date.now();

  // ── Step 1: Load locale files ──────────────────────────────────────────────
  const locales = loadLocales(config.locales);

  if (locales.length === 0) {
    throw new Error(`No locale files found in: ${config.locales}`);
  }

  // ── Step 2: Scan source files ──────────────────────────────────────────────
  const sourceFiles = scanFiles(config, cwd);
  const allUsedKeys = [];
  const allHardcoded = [];

  for (const file of sourceFiles) {
    // Extract t('key') calls
    const keys = extractKeysFromFile(file, cwd);
    allUsedKeys.push(...keys);

    // Detect hardcoded JSX strings
    const hardcoded = detectHardcodedStrings(file, cwd, config.minHardcodedLength);
    allHardcoded.push(...hardcoded);
  }

  // Deduplicate used keys (keep first occurrence for location reporting)
  const usedKeysMap = deduplicateKeys(allUsedKeys);

  // Remove ignored keys from the used keys map
  for (const ignored of config.ignoreKeys) {
    usedKeysMap.delete(ignored);
  }

  // ── Step 3: Compare locales ────────────────────────────────────────────────
  const { missingKeys, unusedKeys, undefinedKeys, interpolationMismatches } =
    compareLocales(locales, usedKeysMap, config.baseLocale);

  // Filter ignored keys from unused/undefined
  const filteredUnusedKeys = unusedKeys.filter((k) => !config.ignoreKeys.includes(k));
  const filteredUndefinedKeys = undefinedKeys.filter((k) => !config.ignoreKeys.includes(k.key));

  // ── Step 4: Assemble result ────────────────────────────────────────────────
  const totalKeys = locales.find((l) => l.locale === config.baseLocale)
    ? Object.keys(locales.find((l) => l.locale === config.baseLocale)!.keys).length
    : 0;

  return {
    missingKeys,
    unusedKeys: filteredUnusedKeys,
    undefinedKeys: filteredUndefinedKeys,
    hardcodedStrings: allHardcoded,
    interpolationMismatches,
    meta: {
      filesScanned: sourceFiles.length,
      localesFound: locales.map((l) => l.locale),
      totalKeys,
      durationMs: Date.now() - startTime,
    },
  };
}

/**
 * Returns true if the result has any actionable issues.
 * Used to determine exit code.
 */
export function hasIssues(result: LintResult): boolean {
  return (
    Object.values(result.missingKeys).some((v) => v.length > 0) ||
    result.unusedKeys.length > 0 ||
    result.undefinedKeys.length > 0 ||
    result.hardcodedStrings.length > 0 ||
    result.interpolationMismatches.length > 0
  );
}
