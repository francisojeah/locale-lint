export default {
  greeting: "Hi",
  nested: { deep: "value" } as const,
} satisfies Record<string, unknown>;
