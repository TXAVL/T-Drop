# T-Drop translations

One JSON file per language (31 languages), each with **every** UI string. These files are
**generated**: do not edit them by hand, edit the sources below and run `npm run i18n:sync`.

| Where | What |
|---|---|
| `src/i18n/translations.ts` | the main per-language dictionaries |
| `shared/i18n/supplement/<lang>.json` | strings added later (and the Electron main-process texts); machine-translated, safe to hand-correct |
| `t-drop-translations/<lang>.json` | the merged, complete view of both (this folder) |

English (`en`) is the source. Correcting a translation: fix the string in
`shared/i18n/supplement/<lang>.json` (or in `translations.ts` if it lives there), then run

```bash
npm run i18n:sync     # translates anything missing, regenerates this folder
npm run i18n:check    # CI-style check: fails if any language has missing strings
```

Placeholders such as `{version}` must be kept exactly; a test (`tests/i18nCoverage.test.ts`)
fails when a translation drops or renames one.
