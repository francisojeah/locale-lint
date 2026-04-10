import { globSync } from "glob";
import path from "path";
import type { LocaleLintConfig } from "../types/index";

/**
 * Returns all source file paths matching the configured extensions,
 * excluding node_modules, dist, and other ignored directories.
 */
export function scanFiles(config: LocaleLintConfig, cwd: string): string[] {
  const { src, extensions, exclude } = config;

  const ignoredGlobs = exclude.map((e) => `**/${e}/**`);

  const files: string[] = [];

  for (const srcDir of src) {
    const pattern = `${srcDir}/**/*.{${extensions.join(",")}}`;
    const matches = globSync(pattern, {
      cwd,
      absolute: true,
      ignore: ignoredGlobs,
    });
    files.push(...matches);
  }

  // Deduplicate (multiple src dirs might overlap)
  return [...new Set(files)];
}

/**
 * Makes an absolute path relative to cwd for cleaner display in output.
 */
export function relativePath(filePath: string, cwd: string): string {
  return path.relative(cwd, filePath);
}
