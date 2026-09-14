# Design

## Decision 1: add to the existing registry

`src/utils/builtInFormatters.js` already holds the built-ins and `CnAppRoot` already provides them as `{ ...BUILT_IN_FORMATTERS, ...props.formatters }`. The two formatters join that map. No new mechanism.

## Decision 2: translate at call time with the library slug

A label resolved at module load would be English for every reader, because the catalogue registers after import. Both formatters call `t('nextcloud-vue', ...)` on each render, the same way `daysUntil` does.

## Decision 3: unknown status values pass through

A status value added to the registry later must still show something. The formatter returns `String(value)` for anything outside the five, and `''` for null or undefined. Only own keys of the label map count, so `toString` is not read as a status.

## Decision 4: app copies keep winning

Integriq and dossiq register their own `connectionStatus` and `connectionSettingsLabel`. Consumer formatters override built-ins, so those apps render exactly as before until they drop the copy.
