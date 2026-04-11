import chalk from "chalk";
import type { LintResult, OutputFormat } from "../types/index";

// ─── Symbols ──────────────────────────────────────────────────────────────────
const CROSS = "❌";
const WARN = "⚠️ ";
const ALARM = "🚨";
const CHECK = "✅";
const ARROW = chalk.dim("→");

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Pretty-prints the full lint result to stdout.
 * Groups issues by category with clear headers and colored output.
 */
export function printResult(result: LintResult, format: OutputFormat): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const {
    missingKeys,
    unusedKeys,
    undefinedKeys,
    hardcodedStrings,
    interpolationMismatches,
    meta,
  } = result;

  // ── Header ────────────────────────────────────────────────────────────────
  console.log();
  console.log(
    chalk.bold.white("  locale-lint") +
      chalk.dim(
        ` — scanning ${pluralize(meta.filesScanned, "file")} across ${pluralize(meta.localesFound.length, "locale")}`,
      ),
  );
  console.log(chalk.dim(`  ${"─".repeat(56)}`));
  console.log();

  let totalIssues = 0;

  // ── Missing Keys ──────────────────────────────────────────────────────────
  const missingLocales = Object.keys(missingKeys);
  if (missingLocales.length > 0) {
    for (const locale of missingLocales) {
      const keys = missingKeys[locale];
      if (keys.length === 0) continue;
      totalIssues += keys.length;

      console.log(
        chalk.red.bold(`  ${CROSS} Missing in ${chalk.underline(locale)}`) +
          chalk.dim(` (${keys.length})`),
      );
      for (const key of keys) {
        console.log(`     ${chalk.dim("·")} ${chalk.yellow(key)}`);
      }
      console.log();
    }
  }

  // ── Undefined Keys (used in code but not in translations) ─────────────────
  if (undefinedKeys.length > 0) {
    totalIssues += undefinedKeys.length;
    console.log(
      chalk.red.bold(`  ${CROSS} Undefined keys`) +
        chalk.dim(
          ` — used in code, missing from all locales (${undefinedKeys.length})`,
        ),
    );
    for (const item of undefinedKeys) {
      const loc = chalk.dim(`${item.file}:${item.line}`);
      console.log(
        `     ${chalk.dim("·")} ${chalk.yellow(item.key)}  ${ARROW}  ${loc}`,
      );
    }
    console.log();
  }

  // ── Unused Keys ───────────────────────────────────────────────────────────
  if (unusedKeys.length > 0) {
    totalIssues += unusedKeys.length;
    console.log(
      chalk.hex("#FFA500").bold(`  ${WARN} Unused keys`) +
        chalk.dim(` — defined but never used in code (${unusedKeys.length})`),
    );
    for (const key of unusedKeys) {
      console.log(`     ${chalk.dim("·")} ${chalk.dim(key)}`);
    }
    console.log();
  }

  // ── Hardcoded Strings ─────────────────────────────────────────────────────
  if (hardcodedStrings.length > 0) {
    totalIssues += hardcodedStrings.length;
    console.log(
      chalk.magenta.bold(`  ${ALARM} Hardcoded text`) +
        chalk.dim(` — raw strings in JSX (${hardcodedStrings.length})`),
    );
    for (const item of hardcodedStrings) {
      const loc = chalk.dim(`${item.file}:${item.line}`);
      console.log(
        `     ${chalk.dim("·")} ${loc}  ${ARROW}  ${chalk.magenta(`"${item.text}"`)}`,
      );
    }
    console.log();
  }

  // ── Interpolation Mismatches ──────────────────────────────────────────────
  if (interpolationMismatches.length > 0) {
    totalIssues += interpolationMismatches.length;
    console.log(
      chalk.red.bold(`  ${CROSS} Interpolation mismatches`) +
        chalk.dim(` (${interpolationMismatches.length})`),
    );
    for (const item of interpolationMismatches) {
      const baseVars = item.baseVars.length
        ? `{${item.baseVars.join(", ")}}`
        : "(none)";
      const targetVars = item.targetVars.length
        ? `{${item.targetVars.join(", ")}}`
        : "(none)";
      console.log(`     ${chalk.dim("·")} ${chalk.yellow(item.key)}`);
      console.log(
        `       ${chalk.dim(item.baseLocale + ":")} ${chalk.green(baseVars)}  ${ARROW}  ${chalk.dim(item.targetLocale + ":")} ${chalk.red(targetVars)}`,
      );
    }
    console.log();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(chalk.dim(`  ${"─".repeat(56)}`));

  if (totalIssues === 0) {
    console.log(
      `  ${CHECK} ${chalk.green.bold("All good!")} ${chalk.dim(`No issues found. (${meta.durationMs}ms)`)}`,
    );
  } else {
    const issueLabel = chalk.red.bold(
      `${totalIssues} issue${totalIssues === 1 ? "" : "s"}`,
    );
    console.log(
      `  ${issueLabel} ${chalk.dim(`found in ${meta.durationMs}ms`)}`,
    );
  }

  console.log();
}

/** Prints detected source and locales paths, then scanning status */
export function printScanning(src: string[], localesDir: string): void {
  process.stdout.write(chalk.dim(`  Source:   ${src.join(", ")}\n`));
  process.stdout.write(
    chalk.dim(`  Locales:  ${localesDir}  `) +
      chalk.yellow("(auto-detected — use --locales to override)") +
      "\n",
  );
  process.stdout.write(chalk.dim(`\n  Scanning ${src.join(", ")}...\n`));
}
