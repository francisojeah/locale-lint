# Copilot instructions

This project ships an i18n linter. When working on translations, locale files, or
i18n setup, use `locale-lint`:

- Run `npx locale-lint check --json` and act on the result.
- Exit codes: `0` clean, `1` issues found, `2` fatal error.

See [AGENTS.md](../AGENTS.md) for when to run it, the `--json` output schema, and
how to resolve each kind of finding.
