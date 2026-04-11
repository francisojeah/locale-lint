import path from "path";
import chalk from "chalk";
import type { LocaleLintConfig, LintResult } from "../types/index";
import { scanFiles } from "./scanFiles";
import { extractKeysFromFile, deduplicateKeys } from "./extractKeys";
import { detectHardcodedStrings } from "./detectHardcoded";
import { loadLocales } from "./loadLocales";
import { compareLocales } from "./compareLocales";

export async function runLint(
  config: LocaleLintConfig,
  cwd: string,
): Promise<LintResult> {
  const startTime = Date.now();

  // Step 1: Load locale files
  const locales = loadLocales(config.locales);

  if (locales.length === 0) {
    throw new Error(`No locale files found in: ${config.locales}`);
  }

  // Detect if keys are wrongly prefixed with locale names (e.g. "en.auth.login")
  // This happens when auto-detect picks a parent folder instead of the translations folder
  const allKeys = locales.flatMap((l) => Object.keys(l.keys));
  const localePrefixes = locales.map((l) => `${l.locale}.`);
  const suspiciousKeys = allKeys.filter((k) =>
    localePrefixes.some((prefix) => k.startsWith(prefix)),
  );
  if (allKeys.length > 0 && suspiciousKeys.length > allKeys.length * 0.2) {
    const detectedDir = path.relative(cwd, config.locales);
    console.warn(
      chalk.yellow(
        '\n  ⚠️  Keys are prefixed with locale names (e.g. "en.auth.login").\n',
      ) +
        chalk.dim("     locale-lint picked the wrong folder: ") +
        chalk.red(detectedDir) +
        "\n\n" +
        chalk.dim("     Fix it permanently in 3 steps:\n") +
        chalk.dim("       1. Run: ") +
        chalk.cyan("npx locale-lint init\n") +
        chalk.dim("       2. Open: ") +
        chalk.cyan("locale-lint.config.json\n") +
        chalk.dim("       3. Set: ") +
        chalk.cyan(`"locales": "src/i18n/translations"\n`) +
        chalk.dim("\n     Or pass the flag directly:\n") +
        chalk.dim("       ") +
        chalk.cyan(
          `npx locale-lint check --locales ${detectedDir}/translations\n`,
        ),
    );
  }

  // Step 2: Scan source files
  const sourceFiles = scanFiles(config, cwd);
  const allUsedKeys = [];
  const allHardcoded = [];

  for (const file of sourceFiles) {
    const keys = extractKeysFromFile(file, cwd);
    allUsedKeys.push(...keys);

    const hardcoded = detectHardcodedStrings(
      file,
      cwd,
      config.minHardcodedLength,
    );
    allHardcoded.push(...hardcoded);
  }

  const usedKeysMap = deduplicateKeys(allUsedKeys);

  for (const ignored of config.ignoreKeys) {
    usedKeysMap.delete(ignored);
  }

  // Step 3: Compare locales
  const { missingKeys, unusedKeys, undefinedKeys, interpolationMismatches } =
    compareLocales(locales, usedKeysMap, config.baseLocale);

  const filteredUnusedKeys = unusedKeys.filter(
    (k) => !config.ignoreKeys.includes(k),
  );
  const filteredUndefinedKeys = undefinedKeys.filter(
    (k) => !config.ignoreKeys.includes(k.key),
  );

  const totalKeys = locales.find((l) => l.locale === config.baseLocale)
    ? Object.keys(locales.find((l) => l.locale === config.baseLocale)!.keys)
        .length
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
