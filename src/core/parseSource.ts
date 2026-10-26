import fs from "fs";
import * as parser from "@babel/parser";
import type { File } from "@babel/types";

export function parseSource(filePath: string): File | null {
  try {
    return parser.parse(fs.readFileSync(filePath, "utf-8"), {
      sourceType: "module",
      plugins: ["typescript", "jsx", "decorators-legacy"],
    });
  } catch {
    return null;
  }
}
