#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { runLint, hasIssues } from "./core/runner";
import { resolveConfig } from "./utils/config";
import { printResult, printScanning } from "./utils/logger";
import type { OutputFormat } from "./types/index";

const program = new Command();

program
  .name("locale-lint")
  .description("Zero-config i18n linter for React, React Native & Next.js")
  .version("1.0.0");

program
  .command("check")
  .description("Run all i18n checks on your codebase")
  .option("--src <dir>", "Source directory to scan (default: auto-detect)")
  .option("--locales <dir>", "Locales directory (default: auto-detect)")
  .option("--base <locale>", "Base locale to compare against (default: en)")
  .option("--json", "Output results as JSON (useful for CI pipelines)")
  .option("--ignore-unused", "Skip unused key detection")
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
        printScanning(config.src.map((s) => path.relative(cwd, s) || s));
      }

      // Run the lint pipeline
      let result = await runLint(config, cwd);

      // Apply CLI-level suppressions
      if (options.ignoreUnused) result = { ...result, unusedKeys: [] };
      if (options.ignoreHardcoded) result = { ...result, hardcodedStrings: [] };

      // Print results
      printResult(result, format);

      // Exit with code 1 if any issues found (enables CI gating)
      if (hasIssues(result)) {
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error();
      console.error(`  ${chalk.red("Error:")} ${message}`);
      console.error();
      process.exit(2);
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
      exclude: ["node_modules", "dist", "build", ".next", "coverage"],
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
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
