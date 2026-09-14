# Connection registry formatters as built-ins

## Why

The fleet connection registry (hydra#667, design D8) shows each app's connections in one table. Two columns need a formatter: the status label and the "Open settings" link text. Integriq and dossiq each carry a local copy of both, and every app that adopts the registry would add another. Issue #1162 asks the library to ship them once.

## What changes

- `BUILT_IN_FORMATTERS` gains `connectionStatus` and `connectionSettingsLabel`.
- `connectionStatus` renders `configured`, `limited`, `unconfigured`, `simulated`, `unavailable` and `error` as Configured, Limited, Not configured, Simulated, Not available and Error. `limited` comes from hydra#673 (design D12). Any other value passes through unchanged.
- `connectionSettingsLabel` renders "Open settings" for a non-empty `settingsUrl`, and an empty string otherwise.
- Labels go through the library catalogue (`nextcloud-vue` slug). `l10n/en.json` and `l10n/nl.json` gain the four strings the catalogue lacked, "Limited" included.
- The docs tables of built-in formatters list both.

## Impact

- Affected apps: integriq and dossiq today, every app adopting the registry later.
- Backward compatible. `CnAppRoot` spreads app formatters over the built-ins, so the local copies keep winning until an app removes them.
- Files: `src/utils/builtInFormatters.js`, `l10n/en.json`, `l10n/nl.json`, `docs/components/cn-cell-renderer.md`, `docs/migrating-to-manifest.md`, `tests/`.
