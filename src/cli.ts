#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { runLint, hasIssues } from "./core/runner";
import { resolveConfig } from "./utils/config";
import { printResult, printScanning } from "./utils/logger";
import type { OutputFormat } from "./types/index";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json");

const program = new Command();

program
  .name("locale-lint")
  .description("Zero-config i18n linter for React, React Native & Next.js")
  .version(version);

program
  .command("check")
  .description("Run all i18n checks on your codebase")
  .option("--src <dir>", "Source directory to scan (default: auto-detect)")
  .option("--locales <dir>", "Locales directory (default: auto-detect)")
  .option("--base <locale>", "Base locale to compare against (default: en)")
  .option("--json", "Output results as JSON (useful for CI pipelines)")
  .option("--ignore-unused", "Skip unused key detection")
  .option("--ignore-undefined", "Skip undefined key detection")
  .option("--ignore-hardcoded", "Skip hardcoded string detection")
  .action(async (options) => {
    const cwd = process.cwd();
    const format: OutputFormat = options.json ? "json" : "pretty";

    try {
      // Resolve configuration (file + CLI flags + auto-detect)
      const config = resolveConfig(cwd, {
        src: options.src,
        locales: options.locales,
        base: options.base,
      });

      if (format === "pretty") {
        printScanning(
          config.src.map((s) => path.relative(cwd, s) || s),
          path.relative(cwd, config.locales),
        );
      }

      // Run the lint pipeline
      let result = await runLint(config, cwd);

      // Apply CLI-level suppressions
      if (options.ignoreUnused) result = { ...result, unusedKeys: [] };
      if (options.ignoreUndefined) result = { ...result, undefinedKeys: [] };
      if (options.ignoreHardcoded) result = { ...result, hardcodedStrings: [] };

      // Print results
      printResult(result, format);

      // Set exit code 1 if issues found (enables CI gating). Use exitCode
      // rather than process.exit() so piped --json output flushes fully.
      if (hasIssues(result)) {
        process.exitCode = 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error();
      console.error(`  ${chalk.red("Error:")} ${message}`);
      console.error();
      process.exitCode = 2;
    }
  });

// ── Extra command: init ────────────────────────────────────────────────────────
program
  .command("init")
  .description("Create a locale-lint.config.json in the current directory")
  .action(() => {
    const fs = require("fs");
    const configPath = path.join(process.cwd(), "locale-lint.config.json");

    if (fs.existsSync(configPath)) {
      console.log(chalk.yellow("  locale-lint.config.json already exists."));
      return;
    }

    const defaultConfig = {
      src: ["src"],
      locales: "locales",
      baseLocale: "en",
      extensions: ["js", "ts", "jsx", "tsx"],
      minHardcodedLength: 3,
      ignoreKeys: [],
      exclude: ["node_modules", "dist", "build", ".next", ".expo", "coverage"],
      namespaceHooks: ["useTranslations", "getTranslations"],
      undefinedKeyResolution: "suffix",
      namespaceAgnosticFiles: [],
    };

    try {
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  ${chalk.red("Error:")} ${message}\n`);
      process.exitCode = 2;
      return;
    }
    console.log();
    console.log(
      `  ${chalk.green("✅")} Created ${chalk.bold("locale-lint.config.json")}`,
    );
    console.log(
      `  Edit it to customize your setup, then run ${chalk.cyan("locale-lint check")}`,
    );
    console.log();
  });

program.parse(process.argv);
