# Contributing to locale-lint

Thanks for helping make i18n less painful. Forks and PRs are very welcome.

## Setup

```bash
git clone https://github.com/francisojeah/locale-lint
cd locale-lint
npm install
npm run build
npm test
```

## Project layout

- `src/cli.ts` — CLI entry (commander)
- `src/core/` — pipeline: `loadLocales`, `scanFiles`, `extractKeys`,
  `detectHardcoded`, `compareLocales`, `runner`
- `src/utils/` — `config`, `flatten`, `logger`
- `test/` — vitest suite + `test/fixtures/`

## Workflow

1. Branch off `main`.
2. Add or update a test in `test/` for your change — fixtures live in `test/fixtures/`.
3. `npm run build && npm test` must pass.
4. Run `npm run lint` to dogfood locale-lint against `example/`.
5. Open a PR. CI runs the suite on Node 16/18/20/22.

## Good first issues

- Add a new locale format (YAML, `.po`).
- Broaden hardcoded-string detection (alerts, toasts, ternaries).
- Add real CLDR plural-category validation.
- Support more i18n call patterns / namespace hooks.

## Reporting bugs

Open an issue with a minimal locale + source snippet that reproduces it. A failing
test fixture is the fastest path to a fix.
