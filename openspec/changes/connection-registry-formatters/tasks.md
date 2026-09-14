# Tasks

- [x] 1.1 Add `connectionStatus` and `connectionSettingsLabel` to `BUILT_IN_FORMATTERS`, translated through `nextcloud-vue`, null-safe. Files: `src/utils/builtInFormatters.js`
- [x] 1.2 Add "Simulated", "Not available" and "Open settings" to `l10n/en.json` and `l10n/nl.json`.
- [x] 2.1 Unit tests for the five statuses, pass-through, null and the settings label. Files: `tests/utils/builtInFormatters.spec.js`
- [x] 2.2 Dutch reader test against the real catalogue. Files: `tests/l10n/registerTranslations.spec.js`
- [x] 2.3 `CnAppRoot` provides both built in, and an app formatter of the same name wins. Files: `tests/components/CnAppRoot.spec.js`
- [x] 3.1 List both formatters in `docs/components/cn-cell-renderer.md` and `docs/migrating-to-manifest.md`.
