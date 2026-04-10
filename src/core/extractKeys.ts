import fs from "fs";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import type { UsedKey } from "../types/index";
import { relativePath } from "./scanFiles";

/**
 * Translation function call patterns to detect.
 *
 * Matches:
 *   t('key')                    — most common (i18next, react-i18next, next-intl)
 *   i18n.t('key')               — i18next instance method
 *   i18n.t('key')               — i18n-js
 *   intl.formatMessage({id:'x'}) — react-intl / FormatJS
 *   $t('key')                   — vue-i18n (future)
 *   useTranslation hook result  — handled by detecting `t(` calls
 */
const T_FUNCTION_NAMES = new Set(["t", "$t"]);
const T_METHOD_NAMES = new Set(["t"]); // for i18n.t(), intl.t()

/**
 * Parses a single source file with Babel and extracts all static translation keys.
 *
 * Only static string keys are captured — dynamic keys like t(`key.${x}`) are
 * intentionally ignored because they can't be statically resolved.
 */
export function extractKeysFromFile(filePath: string, cwd: string): UsedKey[] {
  const source = fs.readFileSync(filePath, "utf-8");
  const usedKeys: UsedKey[] = [];
  const relPath = relativePath(filePath, cwd);

  let ast: ReturnType<typeof parser.parse>;
  try {
    ast = parser.parse(source, {
      sourceType: "module",
      plugins: [
        "typescript",
        "jsx",
        "decorators-legacy",
        "classProperties",
        "optionalChaining",
        "nullishCoalescingOperator",
      ],
    });
  } catch {
    // Skip files that fail to parse (e.g. non-standard syntax)
    return [];
  }

  traverse(ast, {
    // ── Pattern 1: t('key') or $t('key') ──────────────────────────────────
    CallExpression(nodePath) {
      const { node } = nodePath;
      const { callee, arguments: args } = node;

      let isTranslationCall = false;

      // Direct call: t('key')
      if (
        callee.type === "Identifier" &&
        T_FUNCTION_NAMES.has(callee.name)
      ) {
        isTranslationCall = true;
      }

      // Member call: i18n.t('key'), intl.t('key')
      if (
        callee.type === "MemberExpression" &&
        callee.property.type === "Identifier" &&
        T_METHOD_NAMES.has(callee.property.name)
      ) {
        isTranslationCall = true;
      }

      // ── Pattern 2: intl.formatMessage({ id: 'key' }) ───────────────────
      if (
        callee.type === "MemberExpression" &&
        callee.property.type === "Identifier" &&
        callee.property.name === "formatMessage"
      ) {
        // First arg should be an object with an `id` property
        const firstArg = args[0];
        if (firstArg?.type === "ObjectExpression") {
          const idProp = firstArg.properties.find(
            (p) =>
              p.type === "ObjectProperty" &&
              p.key.type === "Identifier" &&
              p.key.name === "id" &&
              p.value.type === "StringLiteral"
          );
          if (idProp && idProp.type === "ObjectProperty" && idProp.value.type === "StringLiteral") {
            usedKeys.push({
              key: idProp.value.value,
              file: relPath,
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
            });
          }
        }
        return;
      }

      if (!isTranslationCall) return;

      // Extract the key — must be a static string literal
      const firstArg = args[0];
      if (!firstArg) return;

      if (firstArg.type === "StringLiteral") {
        // t('some.key') ✅
        usedKeys.push({
          key: firstArg.value,
          file: relPath,
          line: node.loc?.start.line ?? 0,
          column: node.loc?.start.column ?? 0,
        });
      }
      // Template literals like t(`key.${x}`) are intentionally ignored
      // because they can't be statically resolved.
    },
  });

  return usedKeys;
}

/**
 * Deduplicates used keys by key string, preserving the first occurrence location.
 * Returns a map of key → first UsedKey for quick lookup.
 */
export function deduplicateKeys(usedKeys: UsedKey[]): Map<string, UsedKey> {
  const map = new Map<string, UsedKey>();
  for (const used of usedKeys) {
    if (!map.has(used.key)) {
      map.set(used.key, used);
    }
  }
  return map;
}
