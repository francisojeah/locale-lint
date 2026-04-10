import fs from "fs";
import path from "path";
import type { TranslationFile } from "../types/index";
import { flattenObject } from "../utils/flatten";

/**
 * Reads all locale files from the given directory.
 *
 * Supports:
 *   - JSON files: en.json, pt.json, etc.
 *   - TS/JS files with `export default { ... }` or `module.exports = { ... }`
 *
 * File names are used as locale identifiers:
 *   en.json → "en", pt-BR.json → "pt-BR"
 *
 * Also supports namespaced directories:
 *   locales/en/common.json → locale "en", keys prefixed with "common."
 */
export function loadLocales(localesDir: string): TranslationFile[] {
  if (!fs.existsSync(localesDir)) {
    throw new Error(`Locales directory not found: ${localesDir}`);
  }

  const results: TranslationFile[] = [];
  const entries = fs.readdirSync(localesDir);

  for (const entry of entries) {
    const entryPath = path.join(localesDir, entry);
    const stat = fs.statSync(entryPath);

    if (stat.isDirectory()) {
      // Namespaced structure: locales/en/common.json, locales/en/auth.json
      const locale = entry;
      const mergedKeys: Record<string, string> = {};

      const nsFiles = fs.readdirSync(entryPath).filter(isLocaleFile);
      for (const nsFile of nsFiles) {
        const ns = path.basename(nsFile, path.extname(nsFile));
        const nsPath = path.join(entryPath, nsFile);
        const raw = parseLocaleFile(nsPath);
        if (!raw) continue;

        // Prefix keys with namespace: "common.hello", "auth.login"
        const flat = flattenObject(raw);
        for (const [k, v] of Object.entries(flat)) {
          mergedKeys[`${ns}.${k}`] = v;
        }
      }

      if (Object.keys(mergedKeys).length > 0) {
        results.push({ locale, filePath: entryPath, keys: mergedKeys });
      }
    } else if (isLocaleFile(entry)) {
      // Flat structure: locales/en.json, locales/pt.json
      const locale = path.basename(entry, path.extname(entry));
      const raw = parseLocaleFile(entryPath);
      if (!raw) continue;

      results.push({
        locale,
        filePath: entryPath,
        keys: flattenObject(raw),
      });
    }
  }

  return results;
}

function isLocaleFile(filename: string): boolean {
  return /\.(json|js|ts)$/.test(filename) && !filename.startsWith(".");
}

/**
 * Parses a locale file into a plain object.
 * Handles JSON directly; for JS/TS files extracts the exported object literal
 * using a lightweight regex approach (avoids full transpilation).
 */
function parseLocaleFile(filePath: string): Record<string, unknown> | null {
  const ext = path.extname(filePath);

  try {
    if (ext === ".json") {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }

    if (ext === ".ts" || ext === ".js") {
      return parseJsLocaleFile(filePath);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`  ⚠  Could not parse ${filePath}: ${message}`);
  }

  return null;
}

/**
 * Extracts the default-exported object from a TS/JS translation file.
 *
 * Handles all common real-world patterns:
 *
 *   Pattern 1 — Inline export (most common):
 *     export default { home: { title: "Hello" } }
 *
 *   Pattern 2 — Typed inline export:
 *     export default { home: { title: "Hello" } } satisfies Translations
 *     const en: Translations = { ... }; export default en;
 *
 *   Pattern 3 — Named variable then export (very common in typed setups):
 *     const translations = { ... }
 *     export default translations
 *
 *   Pattern 4 — CommonJS:
 *     module.exports = { ... }
 *
 *   Pattern 5 — as const (TypeScript):
 *     export default { ... } as const
 *
 * Strategy: Strip TS syntax → write temp .cjs → require() it.
 * Falls back to AST-based object extraction if require() fails.
 */
function parseJsLocaleFile(filePath: string): Record<string, unknown> | null {
  const content = fs.readFileSync(filePath, "utf-8");

  // ── Strategy 1: Strip TS and require() ──────────────────────────────────
  const result = tryRequireStripped(filePath, content);
  if (result) return result;

  // ── Strategy 2: AST-based object extraction ──────────────────────────────
  return extractViaAst(content);
}

function tryRequireStripped(filePath: string, content: string): Record<string, unknown> | null {
  const cleaned = content
    // Remove comments
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Remove import statements
    .replace(/^import\s+(?:type\s+)?.*$/gm, "")
    // Remove `satisfies SomeType` suffix (TS 4.9+)
    .replace(/\}\s+satisfies\s+\w[\w<>,\s\[\]|&]*/g, "}")
    // Remove `as const` suffix
    .replace(/\bas\s+const\b/g, "")
    // Strip inline type annotations: const x: Type = ...
    .replace(/:\s*(?:Readonly<)?[A-Z][A-Za-z<>,\s\[\]|&.]*>?\s*(?==)/g, "")
    // Strip typed variable annotations like `const en: Translations = {`
    .replace(/^(const|let|var)\s+(\w+)\s*:\s*\w[\w<>,\s\[\]|&]*\s*=/gm, "$1 $2 =")
    // Normalize `export default varName` → `module.exports = varName`
    .replace(/export\s+default\s+(\w+)\s*;?\s*$/m, "module.exports = $1;")
    // Normalize `export default { ... }` → `module.exports = { ... }`
    .replace(/export\s+default\s+/, "module.exports = ")
    // Remove remaining TypeScript export keywords
    .replace(/^export\s+/gm, "");

  const tmpPath = filePath + ".locale-lint.tmp.cjs";
  try {
    fs.writeFileSync(tmpPath, cleaned);
    // Clear require cache to avoid stale results across runs
    delete require.cache[require.resolve(tmpPath)];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(tmpPath);
    const result = mod.default || mod;
    if (result && typeof result === "object" && !Array.isArray(result)) {
      return result as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

/**
 * AST-based fallback: uses Babel to parse the file and extract
 * the object literal assigned to the default export.
 *
 * Works even when require() fails due to complex TS syntax.
 */
function extractViaAst(content: string): Record<string, unknown> | null {
  try {
    // Lazy require Babel — only used as fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const parser = require("@babel/parser");
    const ast = parser.parse(content, {
      sourceType: "module",
      plugins: ["typescript", "decorators-legacy"],
    });

    // Walk top-level statements to find:
    // 1. export default { ... }
    // 2. const x = { ... }; export default x;
    const variableMap = new Map<string, Record<string, unknown>>();
    let defaultExportObj: Record<string, unknown> | null = null;
    let defaultExportName: string | null = null;

    for (const node of ast.program.body) {
      // export default { ... }
      if (
        node.type === "ExportDefaultDeclaration" &&
        node.declaration.type === "ObjectExpression"
      ) {
        defaultExportObj = objectExpressionToPlain(node.declaration);
        break;
      }

      // export default identifier
      if (
        node.type === "ExportDefaultDeclaration" &&
        node.declaration.type === "Identifier"
      ) {
        defaultExportName = node.declaration.name;
      }

      // const x = { ... } or const x: Type = { ... }
      if (node.type === "VariableDeclaration") {
        for (const decl of node.declarations) {
          if (
            decl.id.type === "Identifier" &&
            decl.init?.type === "ObjectExpression"
          ) {
            const obj = objectExpressionToPlain(decl.init);
            if (obj) variableMap.set(decl.id.name, obj);
          }
        }
      }
    }

    if (defaultExportObj) return defaultExportObj;
    if (defaultExportName && variableMap.has(defaultExportName)) {
      return variableMap.get(defaultExportName)!;
    }
  } catch {
    // AST parse failed — try simple regex as last resort
    return extractObjectLiteralFallback(content);
  }

  return extractObjectLiteralFallback(content);
}

/**
 * Converts a Babel ObjectExpression AST node into a plain JS object.
 * Only handles string literal values (which is all we need for locale files).
 */
function objectExpressionToPlain(
  node: { type: string; properties: unknown[] }
): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};

  for (const prop of node.properties) {
    const p = prop as {
      type: string;
      key: { type: string; name?: string; value?: string };
      value: { type: string; value?: string; properties?: unknown[] };
    };

    if (p.type !== "ObjectProperty") continue;

    const key =
      p.key.type === "Identifier" ? p.key.name :
      p.key.type === "StringLiteral" ? p.key.value :
      null;

    if (!key) continue;

    if (p.value.type === "StringLiteral") {
      result[key] = p.value.value;
    } else if (p.value.type === "ObjectExpression" && p.value.properties) {
      result[key] = objectExpressionToPlain(
        p.value as { type: string; properties: unknown[] }
      );
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Last-resort regex fallback for very simple translation files.
 * Works reliably when the file is plain key: "value" pairs.
 */
function extractObjectLiteralFallback(content: string): Record<string, unknown> | null {
  const match = content.match(/(?:export\s+default|module\.exports\s*=)\s*(\{[\s\S]*\})\s*(?:as\s+const|satisfies\s+\w+)?\s*;?\s*$/);
  if (!match) return null;

  try {
    const jsonLike = match[1]
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')   // quote bare keys
      .replace(/,\s*([}\]])/g, "$1")                  // trailing commas
      .replace(/:\s*`([^`]*)`/g, ': "$1"')            // template literals → strings
      .replace(/'/g, '"');                              // single → double quotes
    return JSON.parse(jsonLike);
  } catch {
    return null;
  }
}
