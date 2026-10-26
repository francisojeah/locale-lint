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

  // Parents of nested keys, so a plural parent (orders.count) is recognised in O(1).
  const definedParents = new Set<string>();
  for (const k of allDefinedKeysArray) {
    for (let i = k.indexOf("."); i !== -1; i = k.indexOf(".", i + 1)) {
      definedParents.add(k.slice(0, i));
    }
  }

  const definedByLastSegment = new Map<string, string[]>();
  for (const k of allDefinedKeysArray) {
    const last = k.slice(k.lastIndexOf(".") + 1);
    const bucket = definedByLastSegment.get(last);
    if (bucket) bucket.push(k);
    else definedByLastSegment.set(last, [k]);
  }

  // ── 3. Undefined Keys ──────────────────────────────────────────────────────
  // No exact match and not a plural parent. A short key whose namespace couldn't
  // be resolved is recovered by suffix (unique match by default; any match in
  // namespace-agnostic files), and the key it resolves to counts as used.
  const undefinedKeys: UsedKey[] = [];
  const resolvedBySuffix = new Set<string>();
  for (const [key, usedKey] of usedKeys) {
    if (allDefinedKeys.has(key) || definedParents.has(key)) continue;

    const last = key.slice(key.lastIndexOf(".") + 1);
    const suffixMatches = (definedByLastSegment.get(last) ?? []).filter((k) =>
      k.endsWith(`.${key}`),
    );

    if (
      options.undefinedKeyResolution === "suffix" &&
      suffixMatches.length === 1
    ) {
      resolvedBySuffix.add(suffixMatches[0]);
      continue;
    }
    const filePath = usedKey.file.replace(/\\/g, "/");
    if (
      suffixMatches.length > 0 &&
      options.namespaceAgnosticFiles.some((g) =>
        minimatch(filePath, g.replace(/^\.\//, "")),
      )
    ) {
      suffixMatches.forEach((k) => resolvedBySuffix.add(k));
      continue;
    }

    undefinedKeys.push(usedKey);
  }

  // ── 4. Unused Keys ─────────────────────────────────────────────────────────
  // A plural child (orders.count.one) is used when its parent (orders.count)
  // is called in code: t('orders.count', { count }) resolves at runtime.
  const hasUsedAncestor = (key: string): boolean => {
    for (let i = key.lastIndexOf("."); i > 0; i = key.lastIndexOf(".", i - 1)) {
      if (usedKeys.has(key.slice(0, i))) return true;
    }
    return false;
  };
  const unusedKeys = allDefinedKeysArray.filter(
    (key) =>
      !usedKeys.has(key) && !resolvedBySuffix.has(key) && !hasUsedAncestor(key),
  );

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
