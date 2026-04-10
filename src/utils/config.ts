import fs from "fs";
import path from "path";
import type { LocaleLintConfig } from "../types/index";

const CONFIG_FILES = ["locale-lint.config.json", ".locale-lint.json", "locale-lint.config.js"];

/**
 * Default directories where locale files are commonly found.
 * Ordered by prevalence — most common first so auto-detect is fast.
 *
 * Covers:
 *   - Next.js (next-intl):        messages/, public/locales/
 *   - React / RN (i18next):       locales/, src/locales/, public/locales/
 *   - React Native (i18n-js):     src/i18n/, src/i18n/translations/, i18n/translations/
 *   - Generic:                    translations/, lang/, assets/translations/
 */
const LOCALE_DIR_CANDIDATES = [
  // Root-level (most common)
  "locales",
  "translations",
  "i18n",
  "lang",
  "messages",
  // src/ nested (very common in CRA, Vite, RN)
  "src/locales",
  "src/translations",
  "src/i18n",
  "src/lang",
  "src/i18n/translations",   // ← your RN friend's exact path
  "src/i18n/locales",
  "src/assets/translations",
  // public/ (Next.js + i18next standard)
  "public/locales",
  "public/translations",
  // assets/ (common in React Native)
  "assets/locales",
  "assets/translations",
  "assets/i18n",
  // i18n/ nested (some RN setups)
  "i18n/translations",
  "i18n/locales",
];

/**
 * Default source directories to scan for t() calls and JSX.
 * Covers React, Next.js (app router), React Native structures.
 */
const SRC_DIR_CANDIDATES = [
  "src",
  "app",        // Next.js app router
  "pages",      // Next.js pages router
  "components",
  "screens",    // React Native
  "features",   // Feature-based architecture
  "modules",    // Module-based architecture
];

export function resolveConfig(
  cwd: string,
  flags: { src?: string; locales?: string; base?: string; json?: boolean }
): LocaleLintConfig {
  // 1. Start with defaults
  const defaults: LocaleLintConfig = {
    src: [],
    locales: "",
    baseLocale: "en",
    extensions: ["js", "ts", "jsx", "tsx"],
    minHardcodedLength: 3,
    ignoreKeys: [],
    exclude: ["node_modules", "dist", "build", ".next", "coverage"],
  };

  // 2. Try to load config file
  let fileConfig: Partial<LocaleLintConfig> = {};
  for (const configFile of CONFIG_FILES) {
    const configPath = path.join(cwd, configFile);
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, "utf-8");
        fileConfig = JSON.parse(raw);
        break;
      } catch {
        // Silently ignore malformed config
      }
    }
  }

  // 3. Auto-detect locales directory if not specified
  const localesDir =
    flags.locales ||
    (fileConfig.locales as string | undefined) ||
    autoDetectDir(cwd, LOCALE_DIR_CANDIDATES);

  if (!localesDir) {
    throw new Error(
      `Could not auto-detect a locales directory.\n` +
        `  Tried: ${LOCALE_DIR_CANDIDATES.join(", ")}\n` +
        `  Use --locales <path> or add "locales" to locale-lint.config.json`
    );
  }

  // 4. Auto-detect src directories if not specified
  const srcDirs: string[] =
    flags.src
      ? [flags.src]
      : (fileConfig.src as string[] | undefined) ||
        autoDetectDirs(cwd, SRC_DIR_CANDIDATES);

  if (srcDirs.length === 0) {
    throw new Error(
      `Could not auto-detect a source directory.\n` +
        `  Use --src <path> or add "src" to locale-lint.config.json`
    );
  }

  return {
    ...defaults,
    ...fileConfig,
    src: srcDirs,
    locales: path.isAbsolute(localesDir) ? localesDir : path.join(cwd, localesDir),
    baseLocale: flags.base || (fileConfig.baseLocale as string | undefined) || defaults.baseLocale,
  };
}

function autoDetectDir(cwd: string, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(cwd, candidate))) {
      return candidate;
    }
  }
  return null;
}

function autoDetectDirs(cwd: string, candidates: string[]): string[] {
  return candidates.filter((c) => fs.existsSync(path.join(cwd, c)));
}
