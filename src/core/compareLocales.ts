import type {
  TranslationFile,
  UsedKey,
  InterpolationMismatch,
  LintResult,
} from "../types/index";
import { extractInterpolationVars } from "../utils/flatten";

export interface CompareLocalesResult {
  missingKeys: Record<string, string[]>;
  unusedKeys: string[];
  undefinedKeys: UsedKey[];
  interpolationMismatches: InterpolationMismatch[];
}

/**
 * Compares locale files against each other and against the set of keys
 * actually used in source code.
 *
 * @param locales     - All loaded locale files (flattened keys)
 * @param usedKeys    - All t('key') calls found in source (deduplicated)
 * @param baseLocale  - The source-of-truth locale (e.g. "en")
 */
export function compareLocales(
  locales: TranslationFile[],
  usedKeys: Map<string, UsedKey>,
  baseLocale: string
): CompareLocalesResult {
  const base = locales.find((l) => l.locale === baseLocale);
  const others = locales.filter((l) => l.locale !== baseLocale);

  // ── 1. Missing Keys ────────────────────────────────────────────────────────
  // Keys in base locale that are missing from other locales.
  const missingKeys: Record<string, string[]> = {};

  if (base) {
    for (const other of others) {
      const missing: string[] = [];
      for (const key of Object.keys(base.keys)) {
        if (!(key in other.keys)) {
          missing.push(key);
        }
      }
      if (missing.length > 0) {
        missingKeys[other.locale] = missing.sort();
      }
    }
  }

  // ── 2. All defined keys (across all locales) ───────────────────────────────
  // Use base locale if available; fall back to union of all locales.
  const allDefinedKeys = new Set<string>(
    base
      ? Object.keys(base.keys)
      : locales.flatMap((l) => Object.keys(l.keys))
  );

  // ── 3. Unused Keys ─────────────────────────────────────────────────────────
  // Keys defined in translation files but never called via t() in source code.
  const unusedKeys: string[] = [];
  for (const key of allDefinedKeys) {
    if (!usedKeys.has(key)) {
      unusedKeys.push(key);
    }
  }

  // ── 4. Undefined Keys ──────────────────────────────────────────────────────
  // Keys called via t() in source code but not defined in any locale file.
  const undefinedKeys: UsedKey[] = [];
  for (const [key, usedKey] of usedKeys) {
    if (!allDefinedKeys.has(key)) {
      undefinedKeys.push(usedKey);
    }
  }

  // ── 5. Interpolation Mismatches ────────────────────────────────────────────
  // Keys where the interpolation variables differ between locales.
  // e.g. en: "Hello {{name}}" but pt: "Olá {nome}" — different var name or style
  const interpolationMismatches: InterpolationMismatch[] = [];

  if (base) {
    for (const [key, baseValue] of Object.entries(base.keys)) {
      const baseVars = extractInterpolationVars(baseValue);
      if (baseVars.length === 0) continue; // No interpolation in base, skip

      for (const other of others) {
        const otherValue = other.keys[key];
        if (!otherValue) continue; // Already caught as missing key

        const otherVars = extractInterpolationVars(otherValue);
        const isDifferent =
          baseVars.length !== otherVars.length ||
          baseVars.some((v, i) => v !== otherVars[i]);

        if (isDifferent) {
          interpolationMismatches.push({
            key,
            baseLocale,
            targetLocale: other.locale,
            baseVars,
            targetVars: otherVars,
          });
        }
      }
    }
  }

  return {
    missingKeys,
    unusedKeys: unusedKeys.sort(),
    undefinedKeys: undefinedKeys.sort((a, b) => a.key.localeCompare(b.key)),
    interpolationMismatches,
  };
}
