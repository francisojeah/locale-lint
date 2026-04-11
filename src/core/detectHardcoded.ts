import fs from "fs";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import type { HardcodedString } from "../types/index";
import { relativePath } from "./scanFiles";

/**
 * JSX element names to always ignore (non-UI, technical content).
 * Text inside these tags is likely intentional non-translatable content.
 */
const IGNORED_TAGS = new Set([
  "script",
  "style",
  "code",
  "pre",
  "kbd",
  "var",
  "samp",
  "svg",
  "path",
  "symbol",
  "defs",
]);

/**
 * Strings to always ignore regardless of content.
 * Short strings that are clearly not UI copy.
 */
const ALWAYS_IGNORE = new Set([
  "...",
  "—",
  "–",
  "-",
  "|",
  "/",
  "\\",
  "&",
  "·",
  "•",
  "·",
]);

/**
 * Detects hardcoded (non-translated) strings inside JSX text nodes.
 *
 * Flags:
 *   <Text>Hello world</Text>  → "Hello world" 🚨
 *   <div>Welcome back</div>   → "Welcome back" 🚨
 *
 * Ignores:
 *   <Text>{name}</Text>       — expression, not a literal
 *   <Text>42</Text>           — number-only string
 *   <Text> </Text>            — whitespace only
 *   <Text>OK</Text>           — below minLength threshold
 *   <code>const x = 1</code> — ignored tag
 */
export function detectHardcodedStrings(
  filePath: string,
  cwd: string,
  minLength = 3,
): HardcodedString[] {
  // Only scan JSX files — skip plain .ts/.js without JSX
  const ext = filePath.split(".").pop() ?? "";
  if (!["jsx", "tsx"].includes(ext)) {
    // Still scan .js and .ts — many RN projects use .js for JSX
    // We'll just parse and see if any JSX nodes exist
  }

  const source = fs.readFileSync(filePath, "utf-8");
  const found: HardcodedString[] = [];
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
    return [];
  }

  traverse(ast, {
    // ── JSX Text Nodes: <Text>Hello</Text> ────────────────────────────────
    JSXText(nodePath) {
      const raw = nodePath.node.value;
      const text = raw.trim();

      // Skip empty / whitespace-only
      if (!text) return;

      // Skip if below minimum length
      if (text.length < minLength) return;

      // Skip if it's purely numeric
      if (/^\d+([.,]\d+)?$/.test(text)) return;

      // Skip known ignore list
      if (ALWAYS_IGNORE.has(text)) return;

      // Skip if it looks like a punctuation/symbol cluster
      if (/^[^\w\s]+$/.test(text)) return;

      // Check if parent JSX element is an ignored tag
      const parentEl = nodePath.findParent((p) => p.isJSXElement());
      if (parentEl && parentEl.isJSXElement()) {
        const openingEl = parentEl.node.openingElement;
        if (openingEl.name.type === "JSXIdentifier") {
          const tagName = openingEl.name.name.toLowerCase();
          if (IGNORED_TAGS.has(tagName)) return;
        }
      }

      found.push({
        text,
        file: relPath,
        line: nodePath.node.loc?.start.line ?? 0,
        column: nodePath.node.loc?.start.column ?? 0,
      });
    },

    // ── JSX String Attributes: <Button label="Click me"> ──────────────────
    JSXAttribute(nodePath) {
      const { name, value } = nodePath.node;

      // Only care about string literal values
      if (!value || value.type !== "StringLiteral") return;

      // Only flag attributes that likely contain UI copy
      const UI_COPY_ATTRS = new Set([
        "placeholder",
        "label",
        "title",
        "aria-label",
        "alt",
        "tooltip",
        "hint",
        "description",
        "message",
      ]);

      const attrName =
        name.type === "JSXIdentifier" ? name.name.toLowerCase() : "";

      if (!UI_COPY_ATTRS.has(attrName)) return;

      const text = value.value.trim();

      if (!text || text.length < minLength) return;
      if (/^\d+([.,]\d+)?$/.test(text)) return;
      if (ALWAYS_IGNORE.has(text)) return;
      if (/^[^\w\s]+$/.test(text)) return;

      found.push({
        text,
        file: relPath,
        line: nodePath.node.loc?.start.line ?? 0,
        column: nodePath.node.loc?.start.column ?? 0,
      });
    },
  });

  return found;
}
