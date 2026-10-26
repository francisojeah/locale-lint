import traverse, { type NodePath } from "@babel/traverse";
import type { File } from "@babel/types";
import type { HardcodedString } from "../types/index";
import { relativePath } from "./scanFiles";
import { parseSource } from "./parseSource";

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

const ALWAYS_IGNORE = new Set(["...", "—", "–", "-", "|", "/", "\\", "&", "·", "•"]);

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

function isUserFacing(text: string, minLength: number): boolean {
  if (!text || text.length < minLength) return false;
  if (/^\d+([.,]\d+)?$/.test(text)) return false;
  if (ALWAYS_IGNORE.has(text)) return false;
  return !/^[^\w\s]+$/.test(text);
}

/**
 * Detects hardcoded (non-translated) strings in JSX: text children, string
 * literals in `{'...'}` children, and string values of UI-copy attributes.
 */
export function detectHardcodedStrings(
  filePath: string,
  cwd: string,
  minLength = 3,
  ast: File | null = parseSource(filePath),
): HardcodedString[] {
  const found: HardcodedString[] = [];
  const relPath = relativePath(filePath, cwd);

  if (!ast) return found;

  const add = (
    text: string,
    loc: { start: { line: number; column: number } } | null | undefined,
  ) => {
    if (!isUserFacing(text, minLength)) return;
    found.push({
      text,
      file: relPath,
      line: loc?.start.line ?? 0,
      column: loc?.start.column ?? 0,
    });
  };

  const insideIgnoredTag = (path: NodePath) => {
    const parentEl = path.findParent((p) => p.isJSXElement());
    if (!parentEl?.isJSXElement()) return false;
    const { name } = parentEl.node.openingElement;
    return (
      name.type === "JSXIdentifier" && IGNORED_TAGS.has(name.name.toLowerCase())
    );
  };

  traverse(ast, {
    JSXText(nodePath) {
      if (insideIgnoredTag(nodePath)) return;
      add(nodePath.node.value.trim(), nodePath.node.loc);
    },

    JSXExpressionContainer(nodePath) {
      const { expression } = nodePath.node;
      const text =
        expression.type === "StringLiteral"
          ? expression.value
          : expression.type === "TemplateLiteral" &&
              expression.expressions.length === 0
            ? expression.quasis[0].value.cooked
            : null;
      if (text == null) return;

      const parent = nodePath.parent;
      if (parent.type === "JSXAttribute") {
        if (
          parent.name.type === "JSXIdentifier" &&
          UI_COPY_ATTRS.has(parent.name.name.toLowerCase())
        ) {
          add(text.trim(), nodePath.node.loc);
        }
        return;
      }
      if (insideIgnoredTag(nodePath)) return;
      add(text.trim(), nodePath.node.loc);
    },

    JSXAttribute(nodePath) {
      const { name, value } = nodePath.node;
      if (value?.type !== "StringLiteral") return;
      if (name.type !== "JSXIdentifier") return;
      if (!UI_COPY_ATTRS.has(name.name.toLowerCase())) return;
      add(value.value.trim(), nodePath.node.loc);
    },
  });

  return found;
}
