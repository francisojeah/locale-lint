/**
 * Flattens a deeply nested object into dot-notation keys.
 *
 * Example:
 *   { home: { title: "Hello", sub: { label: "World" } } }
 *   → { "home.title": "Hello", "home.sub.label": "World" }
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
  result: Record<string, string> = {},
): Record<string, string> {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, fullKey, result);
    } else {
      // Store string values; coerce numbers/booleans to string
      result[fullKey] = String(value ?? "");
    }
  }
  return result;
}

/**
 * Extracts interpolation variable names from a translation string.
 * Supports both {{var}} (i18next) and {var} (FormatJS/react-intl) styles.
 *
 * Example:
 *   "Hello {{name}}, you have {count} messages" → ["name", "count"]
 */
export function extractInterpolationVars(str: string): string[] {
  const vars: string[] = [];

  // Match {{var}} style (i18next, i18n-js)
  const doubleBrace = str.matchAll(/\{\{(\w+)\}\}/g);
  for (const match of doubleBrace) vars.push(match[1]);

  // Match {var} style (FormatJS / react-intl)
  const singleBrace = str.matchAll(/\{(\w+)\}/g);
  for (const match of singleBrace) {
    // Avoid duplicates (in case someone mixes styles)
    if (!vars.includes(match[1])) vars.push(match[1]);
  }

  return vars.sort();
}
