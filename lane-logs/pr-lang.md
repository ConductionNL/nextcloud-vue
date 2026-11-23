CnObjectListWidget fetched its OpenRegister list and its child rows without a language, so OpenRegister answered translatable fields in its default language. LaunchPad REQ-OR-003 asks every OpenRegister data request to carry `_lang`. Both requests now send `_lang` from `getLanguage()` in `@nextcloud/l10n`, which reads the page's html lang and falls back to `en`.

What ran locally:
- `tests/components/CnObjectListWidgetLang.spec.js`: 2 passed; the same spec on main fails both.
- Jest for the CnObjectListWidget suites: 40 suites, 235 tests passed.
- eslint on the changed files: no errors (two inherited jsdoc warnings on lines this change does not touch).
- `npm run build`: exit 0.

This change was written with AI assistance (Claude Code) and reviewed before merge.
