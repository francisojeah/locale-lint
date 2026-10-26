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

    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        const itemKey = `${fullKey}.${idx}`;
        if (item !== null && typeof item === "object") {
          flattenObject(item as Record<string, unknown>, itemKey, result);
        } else {
          result[itemKey] = String(item ?? "");
        }
      });
    } else if (value !== null && typeof value === "object") {
      flattenObject(value as Record<string, unknown>, fullKey, result);
    } else {
      result[fullKey] = String(value ?? "");
    }
  }
  return result;
}

const ICU_ARG = /^\s*(\w+)\s*,\s*(?:plural|selectordinal|select|number|date|time)\b/;

/**
 * Extracts interpolation variable names from a translation string, covering
 * {{var}} (i18next), {var} (FormatJS), and ICU {var, plural|select|...} forms.
 * ICU option bodies (e.g. `other {# items}`) are skipped so their translated
 * text isn't mistaken for variables. Returns a de-duplicated, sorted list for
 * set comparison between locales.
 */
export function extractInterpolationVars(str: string): string[] {
  const vars = new Set<string>();

  for (let i = 0; i < str.length; i++) {
    if (str[i] !== "{") continue;
    const { inner, end, closed } = readBraceBlock(str, i);
    if (!closed) break; // unterminated brace — don't invent a variable

    const icu = inner.match(ICU_ARG);
    if (icu) {
      // Skip option bodies: they're translated text, not variables.
      vars.add(icu[1]);
      i = end;
      continue;
    }

    const double = inner.match(/^\s*\{\s*(\w+)\s*\}\s*$/); // {{var}}
    if (double) {
      vars.add(double[1]);
      i = end;
      continue;
    }

    const single = inner.match(/^\s*(\w+)\s*$/); // {var}
    if (single) {
      vars.add(single[1]);
      i = end;
    }
  }

  return Array.from(vars).sort();
}

/** Reads a balanced `{...}` block starting at `start`. `closed` is false if unterminated. */
function readBraceBlock(
  str: string,
  start: number,
): { inner: string; end: number; closed: boolean } {
  let depth = 0;
  for (let j = start; j < str.length; j++) {
    if (str[j] === "{") depth++;
    else if (str[j] === "}" && --depth === 0) {
      return { inner: str.slice(start + 1, j), end: j, closed: true };
    }
  }
  return { inner: str.slice(start + 1), end: str.length - 1, closed: false };
}
