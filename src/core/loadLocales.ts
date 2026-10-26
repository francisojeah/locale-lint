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
  // A locale that fails to parse must fail the run, not vanish silently.
  const errors: string[] = [];
  const entries = fs.readdirSync(localesDir);

  for (const entry of entries) {
    const entryPath = path.join(localesDir, entry);
    const stat = safeStat(entryPath);
    if (!stat) continue;

    if (stat.isDirectory()) {
      // Namespaced structure: locales/en/common.json, locales/en/auth.json
      const locale = entry;
      const mergedKeys: Record<string, string> = {};

      const nsFiles = fs.readdirSync(entryPath).filter(isLocaleFile);
      for (const nsFile of nsFiles) {
        const ns = path.basename(nsFile, path.extname(nsFile));
        const nsPath = path.join(entryPath, nsFile);
        try {
          const raw = parseLocaleFile(nsPath);
          if (!raw) continue;

          // Prefix keys with namespace: "common.hello", "auth.login"
          const flat = flattenObject(raw);
          for (const [k, v] of Object.entries(flat)) {
            mergedKeys[`${ns}.${k}`] = v;
          }
        } catch (err) {
          errors.push(formatParseError(nsPath, err));
        }
      }

      if (Object.keys(mergedKeys).length > 0) {
        results.push({ locale, filePath: entryPath, keys: mergedKeys });
      }
    } else if (isLocaleFile(entry)) {
      // Flat structure: locales/en.json, locales/pt.json
      const locale = path.basename(entry, path.extname(entry));
      try {
        const raw = parseLocaleFile(entryPath);
        if (!raw) continue;

        results.push({
          locale,
          filePath: entryPath,
          keys: flattenObject(raw),
        });
      } catch (err) {
        errors.push(formatParseError(entryPath, err));
      }
    }
  }

  if (errors.length > 0) {
    const count = errors.length;
    throw new Error(
      `Could not parse ${count} locale file${count === 1 ? "" : "s"}:\n` +
        errors.map((e) => `    • ${e}`).join("\n") +
        `\n\n  Fix the syntax error${count === 1 ? "" : "s"} above. ` +
        `A locale that fails to parse cannot be checked.`,
    );
  }

  return results;
}

/** statSync that returns null instead of throwing on dangling symlinks. */
function safeStat(p: string): fs.Stats | null {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function formatParseError(filePath: string, err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return `${filePath}: ${message}`;
}

function isLocaleFile(filename: string): boolean {
  return /\.(json|js|ts)$/.test(filename) && !filename.startsWith(".");
}

/**
 * Parses a locale file into a plain object.
 * Handles JSON directly; for JS/TS files extracts the exported object literal
 * via a Babel AST (no code execution).
 *
 * Throws on any parse/extraction failure — the caller collects these and fails
 * the run, rather than silently dropping the locale.
 */
function parseLocaleFile(filePath: string): Record<string, unknown> | null {
  const ext = path.extname(filePath);

  if (ext === ".json") {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("expected a JSON object of translation keys");
    }
    return parsed;
  }

  if (ext === ".ts" || ext === ".js") {
    const result = parseJsLocaleFile(filePath);
    if (!result) {
      throw new Error(
        "could not read a translations object from this file. locale-lint reads " +
          "static object literals (export default {…}, module.exports = {…}); values " +
          "built from imports, function calls, spreads or template expressions can't be " +
          "resolved without executing the file. Use a JSON locale or a static object.",
      );
    }
    return result;
  }

  return null;
}

/**
 * Reads the default-exported object from a TS/JS translation file via Babel AST.
 * Never executes the file — running arbitrary code from a "locale" file is an
 * ACE risk. Supports inline/named-variable exports, `satisfies` and `as const`.
 */
function parseJsLocaleFile(filePath: string): Record<string, unknown> | null {
  const content = fs.readFileSync(filePath, "utf-8");
  return extractViaAst(content);
}

/**
 * Parses the file with Babel and extracts the object literal assigned to the
 * default export (handles both `export default {…}` and `const x = {…}; export default x`).
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
      if (node.type === "ExportDefaultDeclaration") {
        const decl = unwrapTS(node.declaration);
        if (decl.type === "ObjectExpression") {
          defaultExportObj = objectExpressionToPlain(decl);
          break;
        }
        if (decl.type === "Identifier") {
          defaultExportName = decl.name;
        }
      }

      // module.exports = { ... } or module.exports = x (CommonJS)
      if (
        node.type === "ExpressionStatement" &&
        node.expression.type === "AssignmentExpression" &&
        isModuleExports(node.expression.left)
      ) {
        const right = unwrapTS(node.expression.right);
        if (right.type === "ObjectExpression") {
          defaultExportObj = objectExpressionToPlain(right);
          break;
        }
        if (right.type === "Identifier") {
          defaultExportName = right.name;
        }
      }

      // const x = { ... } or const x: Type = { ... }
      if (node.type === "VariableDeclaration") {
        for (const decl of node.declarations) {
          const init = decl.init && unwrapTS(decl.init);
          if (decl.id.type === "Identifier" && init?.type === "ObjectExpression") {
            const obj = objectExpressionToPlain(init);
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
    return null; // unparseable → fail loud upstream, don't guess
  }

  return null;
}

/** True for `module.exports` or bare `exports` assignment targets. */
function isModuleExports(left: any): boolean {
  if (left?.type !== "MemberExpression") return false;
  return (
    left.object?.type === "Identifier" &&
    left.object.name === "module" &&
    left.property?.type === "Identifier" &&
    left.property.name === "exports"
  );
}

/** Unwraps `x as const` / `x satisfies T` so the inner expression is reached. */
function unwrapTS(node: any): any {
  while (
    node &&
    (node.type === "TSAsExpression" ||
      node.type === "TSSatisfiesExpression" ||
      node.type === "TSConstAssertion")
  ) {
    node = node.expression;
  }
  return node;
}

/** Converts a Babel ObjectExpression node into a plain object of leaf strings. */
function objectExpressionToPlain(node: {
  type: string;
  properties: unknown[];
}): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};

  for (const prop of node.properties) {
    const p = prop as {
      type: string;
      key: { type: string; name?: string; value?: string };
      value: {
        type: string;
        value?: string | number | boolean;
        properties?: unknown[];
        expressions?: unknown[];
        quasis?: { value: { cooked?: string; raw: string } }[];
      };
    };

    if (p.type !== "ObjectProperty") continue;

    const key =
      p.key.type === "Identifier"
        ? p.key.name
        : p.key.type === "StringLiteral"
          ? p.key.value
          : null;

    if (!key) continue;

    const v = unwrapTS(p.value);

    if (v.type === "StringLiteral") {
      result[key] = v.value;
    } else if (
      v.type === "TemplateLiteral" &&
      (v.expressions?.length ?? 0) === 0 &&
      v.quasis?.length
    ) {
      result[key] = v.quasis[0].value.cooked ?? v.quasis[0].value.raw;
    } else if (v.type === "NumericLiteral" || v.type === "BooleanLiteral") {
      result[key] = String(v.value);
    } else if (v.type === "ObjectExpression" && v.properties) {
      result[key] = objectExpressionToPlain(
        v as { type: string; properties: unknown[] },
      );
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}
