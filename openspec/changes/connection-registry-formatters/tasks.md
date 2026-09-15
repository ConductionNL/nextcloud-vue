# Tasks

- [x] 1.1 Add `connectionStatus` and `connectionSettingsLabel` to `BUILT_IN_FORMATTERS`, translated through `nextcloud-vue`, null-safe. Files: `src/utils/builtInFormatters.js`
- [x] 1.2 Add "Simulated", "Not available" and "Open settings" to `l10n/en.json` and `l10n/nl.json`.
- [x] 2.1 Unit tests for the seven statuses, pass-through, null and the settings label. Files: `tests/utils/builtInFormatters.spec.js`
- [x] 2.2 Dutch reader test against the real catalogue. Files: `tests/l10n/registerTranslations.spec.js`
- [x] 2.3 `CnAppRoot` provides both built in, and an app formatter of the same name wins. Files: `tests/components/CnAppRoot.spec.js`
- [x] 3.1 List both formatters in `docs/components/cn-cell-renderer.md` and `docs/migrating-to-manifest.md`.
- [x] 4.1 Map the sixth status `limited` to "Limited" (hydra#673, design D12). Add "Limited" / "Beperkt" to `l10n/en.json` and `l10n/nl.json`, the docs rows and both test files.
- [x] 5.1 Map the seventh status `disabled` to "Switched off" (hydra#677, design D8). Add "Switched off" / "Uitgeschakeld" to `l10n/en.json` and `l10n/nl.json`, the docs rows and both test files.
