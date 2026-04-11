import fs from "fs";
import path from "path";
import type { LocaleLintConfig } from "../types/index";

const CONFIG_FILES = [
  "locale-lint.config.json",
  ".locale-lint.json",
  "locale-lint.config.js",
];

/**
 * ORDERING RULE: Children before parents — always.
 * If "src/i18n" appears before "src/i18n/translations", the parent wins
 * and locale-lint treats translations/ as a namespace. Wrong.
 *
 * Sources used to compile this list:
 *   - next-intl official docs        → messages/
 *   - next-i18next official repo     → public/locales/, app/i18n/locales/
 *   - react-i18next tutorials        → public/locales/, src/locales/, src/i18n/locales/
 *   - i18n-js / React Native         → src/i18n/translations/, app/i18n/locales/
 *   - Expo + i18next tutorials       → src/i18n/locales/, assets/i18n/
 *   - FormatJS / react-intl          → intl/
 *   - Generic / custom setups        → translations/, lang/, strings/
 */
const LOCALE_DIR_CANDIDATES = [
  // Root-level flat (most common overall)
  "locales",
  "translations",
  "lang",
  "messages",
  "intl",
  "strings",

  // src/ nested — children BEFORE parents
  "src/locales",
  "src/translations",
  "src/lang",
  "src/strings",
  "src/intl",
  "src/messages",

  // src/i18n children before src/i18n parent
  "src/i18n/translations",
  "src/i18n/locales",
  "src/i18n/lang",
  "src/i18n/messages",
  "src/i18n",

  // src/config (enterprise React setups)
  "src/config/locales",
  "src/config/translations",
  "src/config/i18n",

  // src/assets (React Native)
  "src/assets/translations",
  "src/assets/locales",
  "src/assets/i18n",

  // app/ nested — Next.js App Router (children before parent)
  "app/i18n/locales",
  "app/i18n/translations",
  "app/i18n/lang",
  "app/i18n",
  "app/locales",
  "app/translations",

  // Root i18n — children before parent
  "i18n/translations",
  "i18n/locales",
  "i18n/lang",
  "i18n/messages",
  "i18n",

  // public/ — Next.js + i18next standard
  "public/locales",
  "public/translations",
  "public/i18n",
  "public/messages",

  // assets/ — React Native
  "assets/locales",
  "assets/translations",
  "assets/i18n",
  "assets/strings",
];

const SRC_DIR_CANDIDATES = [
  "src",
  "app",
  "pages",
  "components",
  "screens",
  "features",
  "modules",
];

export function resolveConfig(
  cwd: string,
  flags: { src?: string; locales?: string; base?: string; json?: boolean },
): LocaleLintConfig {
  const defaults: LocaleLintConfig = {
    src: [],
    locales: "",
    baseLocale: "en",
    extensions: ["js", "ts", "jsx", "tsx"],
    minHardcodedLength: 3,
    ignoreKeys: [],
    exclude: ["node_modules", "dist", "build", ".next", ".expo", "coverage"],
  };

  let fileConfig: Partial<LocaleLintConfig> = {};
  for (const configFile of CONFIG_FILES) {
    const configPath = path.join(cwd, configFile);
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, "utf-8");
        fileConfig = JSON.parse(raw);
        break;
      } catch {
        // ignore malformed config
      }
    }
  }

  const localesDir =
    flags.locales ||
    (fileConfig.locales as string | undefined) ||
    autoDetectDir(cwd, LOCALE_DIR_CANDIDATES);

  if (!localesDir) {
    throw new Error(
      `Could not auto-detect a locales directory.\n` +
        `  Tried: ${LOCALE_DIR_CANDIDATES.slice(0, 8).join(", ")} and ${LOCALE_DIR_CANDIDATES.length - 8} more.\n` +
        `  Fix: npx locale-lint check --locales <path>\n` +
        `  Or:  npx locale-lint init`,
    );
  }

  const srcDirs: string[] = flags.src
    ? [flags.src]
    : (fileConfig.src as string[] | undefined) ||
      autoDetectDirs(cwd, SRC_DIR_CANDIDATES);

  if (srcDirs.length === 0) {
    throw new Error(
      `Could not auto-detect a source directory.\n` +
        `  Fix: npx locale-lint check --src <path>`,
    );
  }

  return {
    ...defaults,
    ...fileConfig,
    src: srcDirs,
    locales: path.isAbsolute(localesDir)
      ? localesDir
      : path.join(cwd, localesDir),
    baseLocale:
      flags.base ||
      (fileConfig.baseLocale as string | undefined) ||
      defaults.baseLocale,
  };
}

function autoDetectDir(cwd: string, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const fullPath = path.join(cwd, candidate);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      const entries = fs.readdirSync(fullPath);
      const hasLocaleContent = entries.some(
        (e) =>
          /\.(json|ts|js)$/.test(e) ||
          fs.statSync(path.join(fullPath, e)).isDirectory(),
      );
      if (hasLocaleContent) return candidate;
    }
  }
  return null;
}

function autoDetectDirs(cwd: string, candidates: string[]): string[] {
  return candidates.filter((c) => {
    const fullPath = path.join(cwd, c);
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  });
}
