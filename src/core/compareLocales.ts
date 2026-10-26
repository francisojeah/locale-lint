import { minimatch } from "minimatch";
import type {
  TranslationFile,
  UsedKey,
  InterpolationMismatch,
} from "../types/index";
import { extractInterpolationVars } from "../utils/flatten";

export interface CompareLocalesResult {
  missingKeys: Record<string, string[]>;
  extraKeys: Record<string, string[]>;
  unusedKeys: string[];
  undefinedKeys: UsedKey[];
  interpolationMismatches: InterpolationMismatch[];
}

export interface CompareLocalesOptions {
  undefinedKeyResolution: "suffix" | "strict";
  namespaceAgnosticFiles: string[];
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
  baseLocale: string,
  options: CompareLocalesOptions = {
    undefinedKeyResolution: "suffix",
    namespaceAgnosticFiles: [],
  },
): CompareLocalesResult {
  const base = locales.find((l) => l.locale === baseLocale);
  const others = locales.filter((l) => l.locale !== baseLocale);

  // ── 1. Missing Keys ────────────────────────────────────────────────────────
  // Keys in base locale that are missing from other locales.
  const missingKeys: Record<string, string[]> = {};

  // ── 1b. Extra Keys (in a target locale but absent from base) ───────────────
  const extraKeys: Record<string, string[]> = {};

  if (base) {
    for (const other of others) {
      const missing: string[] = [];
      const extra: string[] = [];
      for (const key of Object.keys(base.keys)) {
        if (!(key in other.keys)) {
          missing.push(key);
        }
      }
      for (const key of Object.keys(other.keys)) {
        if (!(key in base.keys)) {
          extra.push(key);
        }
      }
      if (missing.length > 0) {
        missingKeys[other.locale] = missing.sort();
      }
      if (extra.length > 0) {
        extraKeys[other.locale] = extra.sort();
      }
    }
  }

  // ── 2. All defined keys ────────────────────────────────────────────────────
  const allDefinedKeys = new Set<string>(
    base ? Object.keys(base.keys) : locales.flatMap((l) => Object.keys(l.keys)),
  );

  const allDefinedKeysArray = Array.from(allDefinedKeys);
  const usedKeysArray = Array.from(usedKeys.keys());

  // ── 3. Unused Keys ─────────────────────────────────────────────────────────
  // Skip plural children (orders.productsCount.one) when the parent
  // (orders.productsCount) is called in code — that's i18next/i18n-js
  // pluralization. t('orders.productsCount', { count }) resolves at runtime.
  const unusedKeys: string[] = [];
  for (const key of allDefinedKeys) {
    if (usedKeys.has(key)) continue;

    const isPluralChild = usedKeysArray.some((usedKey) =>
      key.startsWith(`${usedKey}.`),
    );
    if (!isPluralChild) {
      unusedKeys.push(key);
    }
  }

  // ── 4. Undefined Keys ──────────────────────────────────────────────────────
  // No exact match and not a plural parent. A short key whose namespace couldn't
  // be resolved is recovered by suffix (unique match by default; any match in
  // namespace-agnostic files).
  const definedByLastSegment = new Map<string, string[]>();
  for (const k of allDefinedKeysArray) {
    const last = k.slice(k.lastIndexOf(".") + 1);
    const bucket = definedByLastSegment.get(last);
    if (bucket) bucket.push(k);
    else definedByLastSegment.set(last, [k]);
  }

  const undefinedKeys: UsedKey[] = [];
  for (const [key, usedKey] of usedKeys) {
    const exactMatch = allDefinedKeys.has(key);
    const isPluralParent = allDefinedKeysArray.some((k) =>
      k.startsWith(`${key}.`),
    );
    if (exactMatch || isPluralParent) continue;

    const last = key.slice(key.lastIndexOf(".") + 1);
    const suffixMatches = (definedByLastSegment.get(last) ?? []).filter((k) =>
      k.endsWith(`.${key}`),
    );

    if (options.undefinedKeyResolution === "suffix" && suffixMatches.length === 1) {
      continue;
    }
    const filePath = usedKey.file.replace(/\\/g, "/");
    if (
      suffixMatches.length > 0 &&
      options.namespaceAgnosticFiles.some((g) =>
        minimatch(filePath, g.replace(/^\.\//, "")),
      )
    ) {
      continue;
    }

    undefinedKeys.push(usedKey);
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
          baseVars.some((v) => !otherVars.includes(v));

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
    extraKeys,
    unusedKeys: unusedKeys.sort(),
    undefinedKeys: undefinedKeys.sort((a, b) => a.key.localeCompare(b.key)),
    interpolationMismatches,
  };
}
